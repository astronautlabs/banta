import { ChatMessage, ChatPermissions, CommentsOrder, DurableSocket, User } from "@banta/common";
import { BehaviorSubject, Subject, Subscription } from "rxjs";
import { RpcEvent, SocketRPC } from "@banta/common";
import { ChatSourceBase } from "./chat-source-base";
import { ChatBackend } from "./chat-backend";
import { v4 as uuid } from "uuid";
import { ChatSourceOptions } from "./chat-backend-base";

export type SignInState = 'signed-out' | 'signed-in' | 'signing-in';

export class ChatSource extends SocketRPC implements ChatSourceBase {
    constructor(
        readonly backend: ChatBackend,
        readonly identifier: string,
        readonly parentIdentifier: string,
        options: ChatSourceOptions
    ) {
        super();
        this.options = options ?? {};
        this.ready = new Promise<void>(resolve => this.markReady = resolve);
    }

    private options: ChatSourceOptions;
    private subscription = new Subscription();
    private markReady: () => void;

    readonly = false;
    canLoadMore = true;

    ready: Promise<void>;

    permissions: ChatPermissions;
    private _state: 'connected' | 'connecting' | 'lost' | 'restored' = 'connecting';

    get sortOrder() {
        return this.options?.sortOrder;
    }

    get filterMode() {
        return this.options?.filterMode;
    }

    get state() {
        return this._state;
    }

    set state(value) {
        this._state = value;
        setTimeout(() => this._connectionStateChanged.next(this._state));
    }

    private _connectionStateChanged = new Subject<'connected' | 'connecting' | 'lost' | 'restored'>();
    private _connectionStateChanged$ = this._connectionStateChanged.asObservable();
    get connectionStateChanged() { return this._connectionStateChanged$; }

    private wasRestored = false;

    async bind(socket: DurableSocket): Promise<this> {
        super.bind(socket);

        this.subscription.add(this.backend.userChanged.subscribe(() => this.authenticate()));

        socket.addEventListener('open', async () => {
            console.log(`[Banta/${this.identifier}] Socket is open`);
        });

        socket.addEventListener('error', async () => {
            console.log(`[Banta/${this.identifier}] Socket error`);
        });

        socket.addEventListener('lost', async () => {
            this.state = 'lost';
        });

        socket.addEventListener('restore', async () => {
            this.wasRestored = true;
            await this.authenticate();
            await this.subscribeToTopic();
        });

        try {
            await this.subscribeToTopic();
        } catch (e) {
            console.error(`[Banta/ChatSource] Error during initial subscribeToTopic: ${e.message}`);
        }
        
        return this;
    }

    private mapOrUpdateMessages(messages: ChatMessage[]): ChatMessage[] {
        return messages.map(message => this.mapOrUpdateMessage(message));
    }

    private mapOrUpdateMessage(message: ChatMessage): ChatMessage {
        let existingMessage = this.messageMap.get(message.id);
        if (existingMessage) {
            message = Object.assign(existingMessage, message);
        } else {
            this.messageMap.set(message.id, message);
            this._messageObserved.next(message);
        }

        return message;
    }

    /**
     * Ask server for messages that have occurred since the message with the given ID.
     * This is used during brief reconnects to avoid dropping messages, while also not 
     * causing mobbing as everyone reconnects after an issue. The backend can choose to 
     * not service this request, instead returning undefined. In that case, the client 
     * is expected to fetch the existing messages and start state anew.
     * 
     * TODO: this is not yet used
     * 
     * @param id 
     * @returns 
     */
    async loadSince(id: string): Promise<ChatMessage[]> {
        try {
            let messages = await this.idempotentPeer.loadSince(id);
            if (messages) {
                messages = this.mapOrUpdateMessages(messages);
            }

            return messages;
        } catch (e) {
            console.error(`[Banta/${this.identifier}] Error occurred while trying to get existing messages:`);
            console.error(e);
            return [];
        }
    }

    async getExistingMessages(): Promise<ChatMessage[]> {
        try {
            let messages = await this.idempotentPeer.getExistingMessages(this.options.initialMessageCount ?? 20);
            messages = this.mapOrUpdateMessages(messages);
            return messages;
        } catch (e) {
            console.error(`[Banta/${this.identifier}] Error occurred while trying to get existing messages:`);
            console.error(e);
            return [];
        }
    }

    private async ensureConnection(errorMessage?: string) {
        // let reason = `Connection to chat services is not currently available.`;
        // if (this.state !== 'connected' && this.state !== 'restored') {
        //     if (errorMessage)
        //         throw new Error(`${errorMessage}: ${reason}`);
        //     else
        //         throw new Error(`${reason}`);
        // }
    }

    async editMessage(messageId: string, text: string): Promise<void> {
        await this.ensureConnection();
        await this.peer.editMessage(messageId, text);
    }

    private subscribeAttempt = 0;
    private _errorState: string;

    get errorState() {
        return this._errorState;
    }

    async subscribeToTopic() {
        try {
            await this.immediatePeer.subscribe(
                this.identifier, this.parentIdentifier, this.options.sortOrder, 
                this.options.filterMode,
                this.options.metadata ?? {}
            );
            this.subscribeAttempt = 0;
            this._errorState = undefined;
            this.state = this.wasRestored ? 'restored' : 'connected';
            this.markReady();

        } catch (e) {
            console.error(`[Banta/${this.identifier}] Error while subscribing to topic`);
            console.error(e);

            this.state = 'lost';
            this._errorState = 'server-issue';

            this.subscribeAttempt += 1;
            let delay = Math.min(30*1000, (3*1000 * this.subscribeAttempt) * (1 + Math.random()));
            console.error(`[Banta/${this.identifier}] Waiting ${delay}ms before attempting to reconnect...`);

            setTimeout(() => {
                if (this.state === 'lost') {
                    console.info(`Attempting reconnection after error in subscribeToTopic...`);
                    this.reconnect();
                }
            }, delay);

            throw e;
        }
    }

    private _signInState: SignInState = 'signed-out';
    private _signInStateChanged = new BehaviorSubject<SignInState>(this._signInState);
    private _signInStateChanged$ = this._signInStateChanged.asObservable();

    get signInState() { return this._signInState; }
    get signInStateChanged() { return this._signInStateChanged$; }

    private setSignInState(state: SignInState) {
        this._signInState = state;
        this._signInStateChanged.next(state);
    }
    async authenticate() {
        this.setSignInState('signing-in');
        if (this.backend.user) {
            try {
                await this.immediatePeer.authenticate(this.backend.user?.token);
                this.setSignInState('signed-in');
            } catch (e) {
                console.error(`[Banta] Could not authenticate:`);
                console.error(e);
                this.setSignInState('signed-out');
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
    private _messageObserved = new Subject<ChatMessage>();

    get messageReceived() { return this._messageReceived.asObservable(); }
    get messageUpdated() { return this._messageUpdated.asObservable(); }
    get messageSent() { return this._messageSent.asObservable(); }
    get messageObserved() { return this._messageObserved.asObservable(); }

    messages: ChatMessage[] = [];

    async send(message: ChatMessage): Promise<ChatMessage> {
        await this.ensureConnection();
        message.id ??= uuid();
        let finishedMessage = await this.idempotentPeer.sendMessage(message);

        return finishedMessage;
    }

    async loadAfter(message: ChatMessage, count: number): Promise<ChatMessage[]> {
        if (!message)
            return;

        if (!message.pagingCursor)
            return [];
        
        return this.mapOrUpdateMessages(
            await this.idempotentPeer.loadAfter(Number(message.pagingCursor), count)
        );
    }

    async get(id: string): Promise<ChatMessage> {
        if (this.messageMap.has(id))
            return this.messageMap.get(id);
        
        await this.ensureConnection(`Could not get message`);
        let message = await this.idempotentPeer.getMessage(id);

        if (this.messageMap.has(id)) {
            let existingMessage = this.messageMap.get(id);
            Object.assign(existingMessage, message);
            message = existingMessage;
        } else {
            this.messageMap.set(id, message);
        }

        return message;
    }

    async getCount(): Promise<number> {
        return await this.idempotentPeer.getCount();
    }

    async likeMessage(messageId: string): Promise<void> {
        await this.ensureConnection();
        return await this.idempotentPeer.likeMessage(messageId);
    }

    async unlikeMessage(messageId: string): Promise<void> {
        await this.ensureConnection();
        return await this.idempotentPeer.unlikeMessage(messageId);
    }

    async deleteMessage(messageId: string): Promise<void> {
        await this.ensureConnection();
        return await this.idempotentPeer.deleteMessage(messageId);
    }

}