import { ChatSource } from './chat-source';
import { Observable, Subscription } from 'rxjs';
import { UserAccount } from './user-account';
import { ChatMessage } from './chat-message';
import { NewUserAccount } from './new-user-account';
import { SignUpResult } from './sign-up-result';

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
    getSourceForTopic(topicId : string) : Promise<ChatSource>;
    getSourceForThread(message : ChatMessage) : Promise<ChatSource>;
    refreshMessage(message : ChatMessage): Promise<ChatMessage>;
    getMessage(topicId : string, messageId : string): Promise<ChatMessage>;
    getSubMessage(topicId : string, parentMessageId : string, messageId : string): Promise<ChatMessage>;
    upvoteMessage(topicId : string, messageId : string, submessageId? : string): Promise<void>;
    watchMessage(message : ChatMessage, handler : (message : ChatMessage) => void) : () => void;

    readonly notificationsChanged : Observable<Notification[]>;
    readonly newNotification : Observable<Notification>;

}