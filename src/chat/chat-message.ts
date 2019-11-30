import { User } from '../accounts';
import { Storable } from '../infrastructure';

export interface ChatMessage extends Storable {
    topicId : string;
    parentMessageId : string;
    user : User;
    sentAt : number;
    message : string;
    submessages? : ChatMessage[];
    upvotes : number;
}
