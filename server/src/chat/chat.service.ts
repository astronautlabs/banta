import { Injectable } from "@alterior/di";
import { ChatMessage } from "@banta/common";
import { ChatBackend, Vote } from "@banta/common";

@Injectable()
export class ChatService {
    constructor(
        private chatBackend : ChatBackend
    ) {

    }

    async upvote(message : ChatMessage, vote : Vote) {
        if (!message)
            throw new Error(`Message cannot be null`);
        
        if (message.parentMessageId)
            await this.chatBackend.upvoteMessage(message.topicId, message.parentMessageId, message.id, vote);
        else
            await this.chatBackend.upvoteMessage(message.topicId, message.id, undefined, vote);
    }

    async post(message : ChatMessage) {
        if (!message.user || !message.user.id)
            throw new Error(`Message must include a valid user reference`);
            
        let source = await this.chatBackend.getSourceForTopic(message.topicId);
        return source.send(message);
    }

    async getMessage(topicId : string, messageId : string) {
        return this.chatBackend.getMessage(topicId, messageId);
    }

    async getSubMessage(topicId : string, parentMessageId : string, messageId : string) {
        return this.chatBackend.getSubMessage(topicId, parentMessageId, messageId);
    }
    
    async postSubMessage(topicId : string, messageId : string, message : ChatMessage) {
        if (!message.user || !message.user.id)
            throw new Error(`Message must include a valid user reference`);

        let parentMessage = await this.getMessage(topicId, messageId);
        if (!parentMessage)
            throw { code: 'no-parent-message', message: `Cannot find message ${topicId}/${messageId}` };
    
        let source = await this.chatBackend.getSourceForThread(topicId, messageId);
        return await source.send(message);
    }
}