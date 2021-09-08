import { ChatSource } from './chat-source';
import { Observable, Subscription } from 'rxjs';
import { ChatMessage } from './chat-message';
import { Vote } from './vote';

export abstract class ChatBackend {
    abstract getSourceForTopic(topicId : string) : Promise<ChatSource>;
    abstract getSourceForThread(topicId : string, messageId : string) : Promise<ChatSource>;
    abstract refreshMessage(message : ChatMessage): Promise<ChatMessage>;
    abstract getMessage(topicId : string, messageId : string): Promise<ChatMessage>;
    abstract getSubMessage(topicId : string, parentMessageId : string, messageId : string): Promise<ChatMessage>;
    abstract upvoteMessage(topicId : string, messageId : string, submessageId : string, vote : Vote): Promise<void>;
    abstract watchMessage(message : ChatMessage, handler : (message : ChatMessage) => void) : () => void;
}