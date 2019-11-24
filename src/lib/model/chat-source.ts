import { ChatMessage } from './chat-message';
import { Observable } from 'rxjs';
import { ChatUser } from './chat-user';

export interface ChatSource {
    messageReceived : Observable<ChatMessage>;
    messageSent : Observable<ChatMessage>;
    messages : ChatMessage[];
    currentUserChanged? : Observable<ChatUser>;
    send?(message : ChatMessage);
}