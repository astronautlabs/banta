import { ChatMessage } from './chat-message';
import { Observable } from 'rxjs';
import { User } from './user';
import { CommentsOrder } from './comments-order';

export interface ChatSource {
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
    send(message : ChatMessage) : Promise<ChatMessage>;
    close?();

    // v2
    loadAfter?(message : ChatMessage, count : number) : Promise<ChatMessage[]>;
    get?(id : string) : Promise<ChatMessage>;
}