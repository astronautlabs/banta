import { Injectable } from '@alterior/di';
import { ChatBackend, Notification, ChatSource, ChatMessage, Vote } from '@banta/common';
import { Observable } from 'rxjs';

@Injectable()
export abstract class ChatBackendService implements ChatBackend {
    abstract getSourceForTopic(topicId : string) : Promise<ChatSource>;
    abstract getSourceForThread(topicId : string, messageId : string) : Promise<ChatSource>;
    abstract refreshMessage(message : ChatMessage): Promise<ChatMessage>;
    abstract getMessage(topicId : string, messageId : string): Promise<ChatMessage>;
    abstract getSubMessage(topicId : string, parentMessageId : string, messageId : string): Promise<ChatMessage>;
    abstract upvoteMessage(topicId : string, messageId : string, submessageId? : string, vote? : Vote): Promise<void>;
    abstract watchMessage(message : ChatMessage, handler : (message : ChatMessage) => void) : () => void;
    
    abstract get notificationsChanged() : Observable<Notification[]>;
    abstract get newNotification() : Observable<Notification>;
}