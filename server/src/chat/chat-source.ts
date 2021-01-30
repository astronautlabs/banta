import { ChatMessage } from './chat-message';
import { Observable } from 'rxjs';
import { User } from '../accounts';

export interface ChatSource {
    readonly messageReceived : Observable<ChatMessage>;
    readonly messageSent : Observable<ChatMessage>;
    readonly messages : ChatMessage[];
    readonly currentUserChanged? : Observable<User>;
    send(message : ChatMessage);
}