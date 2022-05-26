import { ChatSource } from './chat-source';
import { Observable } from 'rxjs';
import { ChatMessage } from './chat-message';
import { Vote } from './vote';
import { Notification } from './notification';
import { CommentsOrder } from './comments-order';

export interface ChatSourceOptions {
    sortOrder: CommentsOrder;
}

export interface ChatBackend {
    getSourceForTopic(topicId : string, options?: ChatSourceOptions) : Promise<ChatSource>;
    getSourceForThread(topicId : string, messageId : string, options?: ChatSourceOptions) : Promise<ChatSource>;
    getSourceCountForTopic?(topicId: string): Promise<number>
    refreshMessage(message : ChatMessage): Promise<ChatMessage>;
    getMessage(topicId : string, messageId : string): Promise<ChatMessage>;
    getSubMessage(topicId : string, parentMessageId : string, messageId : string): Promise<ChatMessage>;
    upvoteMessage(topicId : string, messageId : string, submessageId : string, vote : Vote): Promise<void>;
    watchMessage(message : ChatMessage, handler : (message : ChatMessage) => void) : () => void;
    modifyMessage?(message : ChatMessage) : Promise<void>;

    
    readonly notificationsChanged : Observable<Notification[]>;
    readonly newNotification : Observable<Notification>;
}