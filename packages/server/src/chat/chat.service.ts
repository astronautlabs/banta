import { Injectable } from "@alterior/di";
import { ChatMessage } from "@banta/common";
import { Vote } from "@banta/common";
import { Subject } from "rxjs";
import { ChatBackendService } from "../chat-backend-service";

export interface ChatEvent {
    type : 'post' | 'edit' | 'upvote';
}

export interface PostMessageEvent extends ChatEvent {
    type : 'post';
    message : ChatMessage;
}

export interface EditMessageEvent extends ChatEvent {
    type : 'edit';
    message : ChatMessage;
}

export interface UpvoteEvent extends ChatEvent {
    type: 'upvote';
    message : ChatMessage;
    vote : Vote;
}

@Injectable()
export class ChatService {
    constructor(
        private chatBackend : ChatBackendService
    ) {
    }

    private _events = new Subject<ChatEvent>();

    get events() {
        return this._events;
    }

    async upvote(message : ChatMessage, vote : Vote) {
        if (!message)
            throw new Error(`Message cannot be null`);
        
        if (message.parentMessageId)
            await this.chatBackend.upvoteMessage(message.topicId, message.parentMessageId, message.id, vote);
        else
            await this.chatBackend.upvoteMessage(message.topicId, message.id, undefined, vote);
        
        this._events.next(<UpvoteEvent>{ type: 'upvote', message, vote });
    }

    async post(message : ChatMessage) {
        if (!message.user || !message.user.id)
            throw new Error(`Message must include a valid user reference`);
            
        let source = await this.chatBackend.getSourceForTopic(message.topicId);
        message = await source.send(message);
        
        this._events.next(<PostMessageEvent>{ type: 'post', message });
        return message;
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
        message = await source.send(message);

        this._events.next(<PostMessageEvent>{ type: 'post', message });
        return message;
    }

    async getSourceCountForTopic(topicID: string) {
        return this.chatBackend.getSourceCountForTopic(topicID);
    }
}