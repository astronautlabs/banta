import { Injectable } from '@angular/core';
import { ChatSource } from './chat-source';
import { ChatBackend, Notification } from './chat-backend';
import { Observable } from 'rxjs';
import { UserAccount } from './user-account';
import { NewUserAccount } from './new-user-account';
import { ChatMessage } from './chat-message';

@Injectable()
export abstract class ChatBackendService implements ChatBackend {
    abstract getSourceForTopic(topicId : string) : Promise<ChatSource>;
    abstract getSourceForThread(message : ChatMessage) : Promise<ChatSource>;
    abstract refreshMessage(message : ChatMessage): Promise<ChatMessage>;
    abstract getMessage(topicId : string, messageId : string): Promise<ChatMessage>;
    abstract getSubMessage(topicId : string, parentMessageId : string, messageId : string): Promise<ChatMessage>;
    abstract upvoteMessage(topicId : string, messageId : string, submessageId? : string): Promise<void>;
    abstract watchMessage(message : ChatMessage, handler : (message : ChatMessage) => void) : () => void;
    
    abstract get notificationsChanged() : Observable<Notification[]>;
    abstract get newNotification() : Observable<Notification>;
}