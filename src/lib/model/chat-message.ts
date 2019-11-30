import { User } from './user';
import { Storable } from 'src/firebase/datastore';

export interface ChatMessage extends Storable {
    user : User;
    topicId? : string;
    parentMessageId? : string;
    sentAt : number;
    message : string;
    submessages? : ChatMessage[];
    upvotes : number;
}
