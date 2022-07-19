import { Observable } from 'rxjs';
import { ChatMessage, User, CommentsOrder } from '@banta/common';

export abstract class ChatSourceBase {
    /**
     * The topic identifier for the current chat/comments
     */
    identifier : string;

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
    currentUserChanged? : Observable<User>;
    abstract send(message : ChatMessage) : Promise<ChatMessage>;
    abstract close();
    abstract getCount(): Promise<number>;

    // v2
    abstract loadAfter?(message : ChatMessage, count : number) : Promise<ChatMessage[]>;
    abstract get?(id : string) : Promise<ChatMessage>;
    abstract resolveUserState?(message: ChatMessage, userId: string): Promise<void>;

    abstract likeMessage(messageId: string): Promise<void>;
    abstract unlikeMessage(messageId: string): Promise<void>;
}