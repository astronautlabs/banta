import { ChatMessage } from "./chat-message";
import { User } from "./user";

export interface Notification {
    id? : string;
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

export interface UpvoteNotification extends Notification {
    type : 'upvote',
    message : ChatMessage;
    user : User;
}

export interface MentionNotification extends Notification {
    type : 'mention';
    message : ChatMessage;
}