import { ChatMessage } from './chat-message';
import { Observable } from 'rxjs';
import { User } from './user';

export interface ChatSource {
    identifier : string;
    messageReceived : Observable<ChatMessage>;
    messageSent : Observable<ChatMessage>;
    messages : ChatMessage[];
    currentUserChanged? : Observable<User>;
    send(message : ChatMessage);
    close?();
}