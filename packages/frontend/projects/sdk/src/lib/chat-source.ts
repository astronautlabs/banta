import { ChatMessage, CommentsOrder, User } from "@banta/common";
import { Observable, Subject } from "rxjs";
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
    }

    bind(socket: WebSocket): this {
        super.bind(socket);

        if (this.backend.userToken)
            this.peer.authenticate(this.backend.userToken);
        this.peer.subscribe(this.identifier, this.parentIdentifier);

        return this;
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
    currentUserChanged?: Observable<User>;

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