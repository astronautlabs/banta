import { ChatUser } from './chat-user';

export interface ChatMessage {
    user : ChatUser;
    message : string;
    submessages? : ChatMessage[];
    upvotes : number;
}
