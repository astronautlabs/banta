import { ChatMessage, ChatPermissions, CommentsOrder, DurableSocket, User } from "@banta/common";
import { Observable, Subject, Subscription } from "rxjs";
import { RpcEvent, SocketRPC } from "@banta/common";
import { ChatSourceBase } from "./chat-source-base";
import { ChatBackend } from "./chat-backend";

export class ChatSource extends SocketRPC implements ChatSourceBase {
    constructor(
        readonly backend: ChatBackend,
        readonly identifier: string,
        readonly parentIdentifier: string,
        readonly sortOrder: CommentsOrder
    ) {
        super();
        this.ready = new Promise<void>(resolve => this.markReady = resolve);
    }

    private subscription = new Subscription();
    private markReady: () => void;

    ready: Promise<void>;

    permissions: ChatPermissions;
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
        this.subscription.add(this.backend.userChanged.subscribe(() => this.authenticate()));

        socket.addEventListener('open', async () => {
            this.state = 'connected';
        });

        socket.addEventListener('lost', async () => {
            this.state = 'lost';
        });

        socket.addEventListener('restore', async () => {
            this.state = 'restored';
            await this.authenticate();
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
        await this.peer.subscribe(this.identifier, this.parentIdentifier, this.sortOrder);
    }

    async authenticate() {
        if (this.backend.user) {
            try {
                await this.peer.authenticate(this.backend.user?.token);
            } catch (e) {
                console.error(`Could not authenticate with Banta server:`);
                console.error(e);
            }
        }
    }

    close(): void {
        super.close();
        this.subscription.unsubscribe();
    }

    @RpcEvent()
    onPermissions(permissions: ChatPermissions) {
        (window as any).bantaPermissionsDebug = permissions;
        this.permissions = permissions;
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