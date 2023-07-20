import { ChatMessage, ChatPermissions, CommentsOrder, DurableSocket, RpcEvent, SocketRPC } from "@banta/common";
import { Subject, Subscription } from "rxjs";

export class BotSession extends SocketRPC {
    private constructor(
        readonly serverUrl: string
    ) {
        super();
        this.ready = new Promise<void>(resolve => this.markReady = resolve);
    }

    static async connect(serverUrl: string) {
        let socket = new DurableSocket(`${serverUrl.replace(/^http/, 'ws')}/socket`);
        await new Promise<void>((resolve, reject) => {
            socket.onopen = () => resolve();
            socket.onclose = e => {
                if (e.code === 503) {
                    console.error(`Failed to connect to chat service!`);
                    reject(e);
                }
            }
        });

        socket.onerror = undefined;
        let conversation = new BotSession(serverUrl);
        conversation.bind(socket);
        return conversation;
    }

    private subscription = new Subscription();
    private markReady: () => void;

    ready: Promise<void>;

    private _state: 'connected' | 'connecting' | 'lost' | 'restored' = 'connecting';

    get state() {
        return this._state;
    }

    set state(value) {
        this._state = value;
        setTimeout(() => this._connectionStateChanged.next(this._state));
    }

    private _connectionStateChanged = new Subject<'connected' | 'connecting' | 'lost' | 'restored'>();
    get connectionStateChanged() {
        return this._connectionStateChanged.asObservable();
    }

    async bind(socket: DurableSocket): Promise<this> {
        super.bind(socket);
        this.state = 'connected';
        this.markReady();

        await this.subscribeToTopic();

        socket.addEventListener('open', async () => {
            this.state = 'connected';
        });

        socket.addEventListener('lost', async () => {
            this.state = 'lost';
        });

        socket.addEventListener('restore', async () => {
            this.state = 'restored';
            await this.authenticate(this._token);
            await this.subscribeToTopic();
        });

        return this;
    }

    private mapOrUpdateMessages(messages: ChatMessage[]): ChatMessage[] {
        return messages.map(message => this.mapOrUpdateMessage(message));
    }

    private mapOrUpdateMessage(message: ChatMessage): ChatMessage {
        let existingMessage = this.messageMap.get(message.id);
        if (existingMessage)
            message = Object.assign(existingMessage, message);
        else
            this.messageMap.set(message.id, message);

        return message;
    }

    async getExistingMessages(): Promise<ChatMessage[]> {
        let messages = await this.peer.getExistingMessages();
        messages = this.mapOrUpdateMessages(messages);
        return messages;
    }

    private async ensureConnection(errorMessage?: string) {
        let reason = `Connection to chat services is not currently available.`;
        if (this.state !== 'connected' && this.state !== 'restored') {
            if (errorMessage)
                throw new Error(`${errorMessage}: ${reason}`);
            else
                throw new Error(`${reason}`);
        }
    }

    async editMessage(messageId: string, text: string): Promise<void> {
        await this.ensureConnection();
        await this.peer.editMessage(messageId, text);
    }

    async subscribeToTopic() {
        await this.peer.subscribe('-', undefined, CommentsOrder.NEWEST);
    }

    private _token: string = null;
    async authenticate(token: string) {
        this._token = token;
        if (!token)
            return;
        await this.immediatePeer.authenticate(token);
    }

    close(): void {
        super.close();
        this.subscription.unsubscribe();
    }

    @RpcEvent()
    onPermissions(permissions: ChatPermissions) {
        // Override to add functionality
    }

    @RpcEvent()
    onChatMessage(message: ChatMessage) {
        if (this.messageMap.has(message.id)) {
            return this.mapOrUpdateMessage(message);
        } else if (!message.hidden) {
            // Only process non-hidden messages through here. 
            // Hidden messages may be sent to us when they become hidden (ie moderation is occurring).
            // But if we never had the message to begin with, we should discard it.
            this.messageMap.set(message.id, message);
            this._messageReceived.next(message);
        }
    }

    private messageMap = new Map<string, ChatMessage>();
    private _messageReceived = new Subject<ChatMessage>();
    private _messageUpdated = new Subject<ChatMessage>();
    private _messageSent = new Subject<ChatMessage>();

    get messageReceived() { return this._messageReceived.asObservable(); }
    get messageUpdated() { return this._messageUpdated.asObservable(); }
    get messageSent() { return this._messageSent.asObservable(); }

    messages: ChatMessage[] = [];

    async reply(parentMessage: ChatMessage, message: string) {
        if (parentMessage.parentMessageId)
            throw new Error(`Only one level of replies is supported.`);

        await this.send(<ChatMessage>{
            user: undefined,
            message: message,
            topicId: parentMessage.topicId,
            parentMessageId: parentMessage.id
        });
    }

    async send(message: ChatMessage): Promise<ChatMessage> {
        await this.ensureConnection();
        return await this.peer.sendMessage(message);
    }

    async loadAfter(message: ChatMessage, count: number): Promise<ChatMessage[]> {
        if (!message)
            return;

        if (!message.pagingCursor)
            return [];
        
        return this.mapOrUpdateMessages(
            await this.peer.loadAfter(Number(message.pagingCursor), count)
        );
    }

    async get(id: string): Promise<ChatMessage> {
        if (this.messageMap.has(id))
            return this.messageMap.get(id);
        
        await this.ensureConnection(`Could not get message`);
        let message = await this.peer.getMessage(id);
        this.messageMap.set(id, message);

        return message;
    }

    async getCount(): Promise<number> {
        return await this.peer.getCount();
    }

    async likeMessage(messageId: string): Promise<void> {
        await this.ensureConnection();
        return await this.peer.likeMessage(messageId);
    }

    async unlikeMessage(messageId: string): Promise<void> {
        await this.ensureConnection();
        return await this.peer.unlikeMessage(messageId);
    }

    async deleteMessage(messageId: string): Promise<void> {
        await this.ensureConnection();
        return await this.peer.deleteMessage(messageId);
    }

}