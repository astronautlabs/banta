import { Observable } from 'rxjs';
import { ChatMessage, User, CommentsOrder } from '@banta/common';

export interface ChatSourcePermissions {
    canPost: boolean;
    canEdit: boolean;
    canLike: boolean;
}

export interface ChatSourceBase {
    /**
     * The topic identifier for the current chat/comments
     */
    identifier : string;
    permissions: ChatSourcePermissions;

    /**
     * The ID of the parent message that this thread chat source is for.
     * When this is not set, the chat source is a top-level ("topic") source.
     * When it is set, this chat source is a thread source (ie replies).
     */
    parentIdentifier? : string;
    sortOrder?: CommentsOrder;
    messageReceived : Observable<ChatMessage>;
    messageSent : Observable<ChatMessage>;
    messages : ChatMessage[];
    send(message : ChatMessage) : Promise<ChatMessage>;
    close();
    getCount(): Promise<number>;
    loadAfter(message : ChatMessage, count : number) : Promise<ChatMessage[]>;
    get(id : string) : Promise<ChatMessage>;
    likeMessage(messageId: string): Promise<void>;
    unlikeMessage(messageId: string): Promise<void>;
    modifyMessage(messageId: string, text: string) : Promise<void>;
}