import { ChatSource } from './chat-source';
import { User } from './user';

export interface UserPermissions {
    /**
     * Whether the signed in user is allowed to comment on the given topic ID.
     * Defaults to true.
     */
    canComment? : ((source : ChatSource) => boolean);

    /**
     * Whether the signed in user is allowed to chat on the given topic ID.
     * Defaults to true.
     */
    canChat? : ((source : ChatSource) => boolean);
}

export interface UserAccount extends User {
    email : string;
    createdAt : number;
    updatedAt : number;
    permissions? : UserPermissions;
}