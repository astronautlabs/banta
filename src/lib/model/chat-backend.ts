import { ChatSource } from './chat-source';
import { Observable, Subscription } from 'rxjs';
import { UserAccount } from './user';
import { ChatMessage } from './chat-message';

export interface Notification {
    id : string;
    recipientId : string;
    sentAt : number;
    type : string;
}

export interface ReplyNotification extends Notification {
    type : 'reply';
    originalMessage : ChatMessage;
    replyMessage : ChatMessage;
}

export interface NoticeNotification extends Notification {
    type : 'notice',
    message : string;
    actionUrl : string;
    actionLabel : string;
}

export interface MentionNotification extends Notification {
    type : 'mention';
    message : ChatMessage;
}



export interface ChatBackend {
    readonly userChanged : Observable<UserAccount>;

    signInWithPassword(email : string, password : string) : Promise<UserAccount>;
    signOut() : Promise<void>;

    getSourceForTopic(topicId : string) : ChatSource;
    getSourceForThread(message : ChatMessage) : ChatSource;
    refreshMessage(message : ChatMessage): Promise<ChatMessage>;
    getMessage(topicId : string, messageId : string): Promise<ChatMessage>;
    
    readonly notificationsChanged : Observable<Notification[]>;
    readonly newNotification : Observable<Notification>;

}