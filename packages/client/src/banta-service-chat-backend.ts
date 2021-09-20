import { ChatSource, ChatMessage, ChatBackend, Notification } from '@banta/common';
import { Observable } from 'rxjs';

export class BantaServiceChatSource implements ChatSource {
    constructor(
        readonly identifier : string,
        private underlyingChatSource : ChatSource,
        private backend : BantaServiceChatBackend,
        private collectionPath : string
    ) {
    }

    get messageReceived(): Observable<ChatMessage> {
        return this.underlyingChatSource.messageReceived;
    }

    get messageSent(): Observable<ChatMessage> {
        return this.underlyingChatSource.messageSent;
    }

    get messages(): ChatMessage[] {
        return this.underlyingChatSource.messages;
    }

    async send(message: ChatMessage) {
        if (!this.backend.userToken) {
            // Not signed in
            console.error(`Cannot send message: Not signed in.`);
            return;
        }

        let response = await fetch(
            `${this.backend.baseUrl}${this.collectionPath}`, 
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.backend.userToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(message)
            }
        );

        if (response.status >= 400) {
            let body = await response.json();
            throw new Error(`Caught error sending message: ${response.status} ${response.statusText}: ${body.message || '<no message>'}`);
        }

        //messageSent.next(message);
    }
    
    close() {
        if (this.underlyingChatSource.close)
            this.underlyingChatSource.close();
    }
}

export class BantaServiceChatBackend implements ChatBackend {
    constructor(
        private _underlyingChatBackend : ChatBackend,
        baseUrl : string
    ) {
        this.baseUrl = baseUrl;
    }

    get underlyingChatBackend() {
        return this._underlyingChatBackend;
    }

    get notificationsChanged(): Observable<Notification[]> {
        return this._underlyingChatBackend.notificationsChanged;
    }

    get newNotification(): Observable<Notification> {
        return this._underlyingChatBackend.newNotification;
    }

    async getSourceForTopic(topicId: string): Promise<ChatSource> {
        return new BantaServiceChatSource(
            await this._underlyingChatBackend.getSourceForTopic(topicId),
            this,
            `/topics/${topicId}/messages`
        );
    }

    async getSourceForThread(topicId: string, messageId: string): Promise<ChatSource> {
        return new BantaServiceChatSource(
            await this._underlyingChatBackend.getSourceForThread(topicId, messageId),
            this,
            `/topics/${topicId}/messages/${messageId}`
        );
    }

    async refreshMessage(message: ChatMessage): Promise<ChatMessage> {
        return await this._underlyingChatBackend.refreshMessage(message);
    }

    async getMessage(topicId: string, messageId: string): Promise<ChatMessage> {
        return await this._underlyingChatBackend.getMessage(topicId, messageId);
    }

    async getSubMessage(topicId: string, parentMessageId: string, messageId: string): Promise<ChatMessage> {
        return await this._underlyingChatBackend.getSubMessage(topicId, parentMessageId, messageId);
    }

    watchMessage(message: ChatMessage, handler: (message: ChatMessage) => void): () => void {
        return this._underlyingChatBackend.watchMessage(message, handler);
    }
    
    public baseUrl : string;
    public userToken : string;

    async upvoteMessage(topicId : string, messageId : string, submessageId? : string): Promise<void> {
        let path = `${this.baseUrl}/topics/${topicId}/messages/${messageId}/upvote`;

        if (submessageId) 
            path = `${this.baseUrl}/topics/${topicId}/messages/${messageId}/messages/${submessageId}/upvote`;

        let response = await fetch(
            path, 
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.userToken}`,
                    'Content-Type': 'application/json'
                },
                body: '{}'
            }
        );

        if (response.status >= 400) {
            let body = await response.json();
            throw new Error(`Caught error upvoting message ${topicId}/${messageId}: ${response.status} ${response.statusText}: ${body.message || '<no message>'}`);
        }
    }
}