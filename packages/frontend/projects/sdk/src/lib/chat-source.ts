import { ChatMessage, ChatPermissions, CommentsOrder, User } from "@banta/common";
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
    state: 'connected' | 'connecting' | 'lost' | 'restored' = 'connecting';

    async bind(socket: WebSocket): Promise<this> {
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

    async getExistingMessages(): Promise<ChatMessage[]> {
        let messages = await this.peer.getExistingMessages();
        messages = messages.map(message => {
            let existingMessage = this.messageMap.get(message.id);

            if (existingMessage)
                message = Object.assign(existingMessage, message);
            else
                this.messageMap.set(message.id, message);

            return message;
        });

        return messages;
    }

    async editMessage(messageId: string, text: string): Promise<void> {
        this.peer.editMessage(messageId, text);
    }

    async subscribeToTopic() {
        await this.peer.subscribe(this.identifier, this.parentIdentifier, this.sortOrder);
    }

    async authenticate() {
        if (this.backend.user)
            await this.peer.authenticate(this.backend.user?.token);
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
            Object.assign(this.messageMap.get(message.id), message);
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
    private _messageSent = new Subject<ChatMessage>();

    get messageReceived() { return this._messageReceived.asObservable(); }
    get messageSent() { return this._messageSent.asObservable(); }

    messages: ChatMessage[] = [];

    async send(message: ChatMessage): Promise<ChatMessage> {
        return await this.peer.sendMessage(message);
    }

    async loadAfter(message: ChatMessage, count: number): Promise<ChatMessage[]> {
        if (!message)
            return;

        if (!message.pagingCursor)
            return [];
        
        return this.peer.loadAfter(Number(message.pagingCursor), count);
    }

    async get(id: string): Promise<ChatMessage> {
        if (this.messageMap.has(id))
            return this.messageMap.get(id);
        
        let message = await this.peer.getMessage(id);
        this.messageMap.set(id, message);

        return message;
    }

    async getCount(): Promise<number> {
        return await this.peer.getCount();
    }

    async likeMessage(messageId: string): Promise<void> {
        return await this.peer.likeMessage(messageId);
    }

    async unlikeMessage(messageId: string): Promise<void> {
        return await this.peer.unlikeMessage(messageId);
    }

    async deleteMessage(messageId: string): Promise<void> {
        return await this.peer.deleteMessage(messageId);
    }

}