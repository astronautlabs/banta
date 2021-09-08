import { User } from './user';

export interface ChatMessage {
    id? : string;
    user : User;
    topicId? : string;
    parentMessageId? : string;
    sentAt : number;
    message : string;
    submessages? : ChatMessage[];
    upvotes : number;
}
