import { ChatMessage, CommentsOrder, User } from "@banta/common";
import { Observable, Subject, Subscription } from "rxjs";
import { RpcEvent, SocketRPC } from "@banta/common";
import { ChatSourceBase, ChatSourcePermissions } from "./chat-source-base";
import { ChatBackend } from "./chat-backend";

export class ChatSource extends SocketRPC implements ChatSourceBase {
    constructor(
        readonly backend: ChatBackend,
        readonly identifier: string,
        readonly parentIdentifier: string,
        readonly sortOrder: CommentsOrder
    ) {
        super();
    }

    private subscription = new Subscription();

    permissions: ChatSourcePermissions;

    bind(socket: WebSocket): this {
        super.bind(socket);

        this.subscribeToTopic();
        this.subscription.add(this.backend.userChanged.subscribe(() => this.authenticate()));

        socket.addEventListener('restore', async () => {
            await this.authenticate();
            await this.subscribeToTopic();
        });

        return this;
    }

    async modifyMessage(messageId: string, text: string): Promise<void> {
        this.peer.modifyMessage(messageId, text);
    }

    async subscribeToTopic() {
        await this.peer.subscribe(this.identifier, this.parentIdentifier);
    }

    async authenticate() {
        this.permissions = await this.peer.authenticate(this.backend.user?.token);
    }

    close(): void {
        super.close();
        this.subscription.unsubscribe();
    }

    @RpcEvent()
    onPermissions(permissions: ChatSourcePermissions) {
        console.log(`New permissions:`);
        console.dir(permissions);
        this.permissions = permissions;
    }

    @RpcEvent()
    onChatMessage(message: ChatMessage) {
        if (this.messageMap.has(message.id)) {
            Object.assign(this.messageMap.get(message.id), message);
        } else {
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
        return this.peer.sendMessage(message);
    }

    async loadAfter(message: ChatMessage, count: number): Promise<ChatMessage[]> {
        // TODO
        return [];
    }

    async get(id: string): Promise<ChatMessage> {
        return await this.peer.getChatMessage(id);
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

}