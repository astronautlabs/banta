import { Injectable } from "@alterior/di";
import { ChatMessage } from "./chat-message";
import { DataStore, Counter } from "../infrastructure";
import { FieldValue } from "@google-cloud/firestore";
import * as uuid from 'uuid/v4';
import { AccountsService, MentionNotification, ReplyNotification } from "../accounts";

@Injectable()
export class ChatService {
    constructor(
        private accounts : AccountsService,
        private datastore : DataStore
    ) {

    }

    private extractMentions(message : string): string[] {
        let set = new Set<string>();
        let match = message.match(/@[A-Za-z0-9]+\b/g);

        if (!match)
            return [];
        
        message
            .match(/@[A-Za-z0-9]+\b/g)
            .map(x => x.slice(1))
            .forEach(x => set.add(x))
        ;

        return Array.from(set.keys());
    }

    private async recordMessage(topicPath : string, message : ChatMessage) {
        let finalMessage : ChatMessage;
        await Promise.all([
            this.datastore.update<ChatMessage>(
                `${topicPath}/messages/:id`,
                finalMessage = Object.assign(<Partial<ChatMessage>>{}, message, { 
                    id: uuid(),
                    sentAt: Date.now()
                })
            ),
            this.datastore.update<Counter>(
                `${topicPath}/counters/messages`,
                { value: <any>FieldValue.increment(1) }
            )
        ]);

        return finalMessage;
    }

    async post(message : ChatMessage) {
        if (!message.user || !message.user.id)
            throw new Error(`Message must include a valid user reference`);
        
        let finalMessage = await this.recordMessage(`/topics/${message.topicId}`, message);
        
        await this.sendMentionNotifications(finalMessage);

        return finalMessage;
    }

    async getMessage(topicId : string, messageId : string) {
        return await this.datastore.read<ChatMessage>(`/topics/${topicId}/messages/${messageId}`);
    }
    
    async postSubMessage(topicId : string, messageId : string, message : ChatMessage) {
        if (!message.user || !message.user.id)
            throw new Error(`Message must include a valid user reference`);

        let parentMessage = await this.getMessage(topicId, messageId);
        if (!parentMessage)
            throw { code: 'no-parent-message', message: `Cannot find message ${topicId}/${messageId}` };
    
        message.topicId = topicId;
        message.parentMessageId = messageId;

        let finalMessage : ChatMessage = await this.recordMessage(
            `/topics/${topicId}/messages/${messageId}`,
            message, 
        );

        await this.sendMentionNotifications(finalMessage, [ parentMessage.user.id ]);

        // Send reply notification
        await this.accounts.sendNotification(<ReplyNotification>{
            type: 'reply',
            recipientId: parentMessage.user.id,
            originalMessage: parentMessage,
            replyMessage: finalMessage
        });

        return finalMessage;
    }

    async sendMentionNotifications(message : ChatMessage, skipUserIDs : string[] = []) {
        // Find users mentioned...

        let mentions = this.extractMentions(message.message)
            .filter(x => x !== message.user.username);

        if (mentions.length > 20)
            mentions = mentions.slice(0, 20);
        
        let accounts = await this.accounts.getUsersByUsernames(mentions);
        accounts = accounts.filter(x => x && x.uid && !skipUserIDs.includes(x.uid));

        if (mentions.length > 0) {
            console.log(`Mentioned:`);
            console.dir(mentions);
            console.log(`Found:`);
            console.dir(accounts);
        }

        // Post mention notifications...
        try {
            await Promise.all(
                accounts.map(
                    mentioned => {
                        console.log(`Notifying ${mentioned.username} of mention...`);
                        this.accounts.sendNotification(
                            <MentionNotification>{
                                type: 'mention',
                                recipientId: mentioned.uid,
                                message
                            }
                        );
                    }
                )
            );
        } catch (e) {
            console.error(`Caught error while trying to send mention notifications for new message (skipping):`);
            console.error(e);
        }
    }
}