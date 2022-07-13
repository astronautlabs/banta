import { User } from './user';

export interface ChatMessageAttachment {
	type: string;
	url?: string;
}

export interface ChatMessage {
    id? : string;
    user : User;
    topicId? : string;
    url? : string;
    parentMessageId? : string;
    sentAt : number;
    updatedAt? : number;
    hidden? : boolean;
    message : string;
    submessages? : ChatMessage[];
    upvotes : number;
    attachments?: ChatMessageAttachment[]
}
