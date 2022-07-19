import { Observable } from 'rxjs';
import { ChatMessage, Vote, CommentsOrder, Notification } from '@banta/common';
import { ChatSourceBase } from './chat-source-base';

export interface ChatSourceOptions {
    sortOrder: CommentsOrder;
}

export abstract class ChatBackendBase {
    abstract getSourceForTopic(topicId : string, options?: ChatSourceOptions) : Promise<ChatSourceBase>;
    abstract getSourceForThread(topicId : string, messageId : string, options?: ChatSourceOptions) : Promise<ChatSourceBase>;
    abstract getSourceCountForTopic(topicId: string): Promise<number>
    abstract refreshMessage(message : ChatMessage): Promise<ChatMessage>;
    abstract getMessage(topicId : string, messageId : string): Promise<ChatMessage>;
    abstract getSubMessage(topicId : string, parentMessageId : string, messageId : string): Promise<ChatMessage>;
    abstract watchMessage(message : ChatMessage, handler : (message : ChatMessage) => void) : () => void;
    abstract modifyMessage(message : ChatMessage) : Promise<void>;

    readonly notificationsChanged : Observable<Notification[]>;
    readonly newNotification : Observable<Notification>;
}