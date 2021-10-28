import { User } from './user';

export interface ChatMessage {
    id? : string;
    user : User;
    topicId? : string;
    parentMessageId? : string;
    sentAt : number;
    updatedAt? : number;
    hidden? : boolean;
    message : string;
    submessages? : ChatMessage[];
    upvotes : number;
}
