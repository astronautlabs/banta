import { Injectable } from '@angular/core';
import { ChatSource } from './chat-source';
import { ChatBackend, Notification } from './chat-backend';
import { Observable } from 'rxjs';
import { UserAccount } from './user';
import { ChatMessage } from './chat-message';

@Injectable()
export abstract class ChatBackendService implements ChatBackend {
    abstract get userChanged() : Observable<UserAccount>;
    abstract getSourceForTopic(topicId : string) : ChatSource;
    abstract signInWithPassword(email : string, password : string): Promise<UserAccount>;
    abstract signOut() : Promise<void>;
    abstract getSourceForThread(message : ChatMessage) : ChatSource;
    abstract refreshMessage(message : ChatMessage): Promise<ChatMessage>;
    abstract getMessage(topicId : string, messageId : string): Promise<ChatMessage>;

    abstract get notificationsChanged() : Observable<Notification[]>;
    abstract get newNotification() : Observable<Notification>;
}