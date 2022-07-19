import { Inject, Injectable, Optional } from "@angular/core";
import { ChatMessage, CommentsOrder, Notification, Vote } from "@banta/common";
import { Observable } from "rxjs";
import { ChatBackendBase, ChatSourceOptions } from "./chat-backend-base";
import { ChatSource } from "./chat-source";
import { ChatSourceBase } from "./chat-source-base";
import { BANTA_SDK_OPTIONS, SdkOptions } from "./sdk-options";

@Injectable()
export class ChatBackend extends ChatBackendBase {
    constructor(
        @Inject(BANTA_SDK_OPTIONS) private options: SdkOptions
    ) {
        super();
    }

    userToken = 'abc';

    private async connectToService() {
        let serviceUrl = `${this.options?.serviceUrl ?? 'ws://localhost:3422'}/socket`;
        let socket = new WebSocket(serviceUrl);
        await new Promise<void>((resolve, reject) => {
            socket.onopen = () => {
                resolve();
            }

            socket.onerror = e => {
                reject(new Error(`Failed to connect to ${serviceUrl}`));
            }
        });

        socket.onerror = undefined;

        return socket;
    }

    async getSourceForTopic(topicId: string, options?: ChatSourceOptions): Promise<ChatSourceBase> {
        return new ChatSource(this, topicId, undefined, options?.sortOrder || CommentsOrder.NEWEST)
            .bind(await this.connectToService());
    }

    async getSourceForThread(topicId: string, messageId: string, options?: ChatSourceOptions): Promise<ChatSource> {
        return new ChatSource(this, topicId, messageId, options?.sortOrder || CommentsOrder.NEWEST)
            .bind(await this.connectToService());
    }

    async getSourceCountForTopic(topicId: string): Promise<number> {
        let source = new ChatSource(this, topicId, undefined, CommentsOrder.NEWEST)
            .bind(await this.connectToService());

        return await source.getCount();
    }

    refreshMessage(message: ChatMessage): Promise<ChatMessage> {
        throw new Error("Method not implemented.");
    }
    
    getMessage(topicId: string, messageId: string): Promise<ChatMessage> {
        throw new Error("Method not implemented.");
    }
    getSubMessage(topicId: string, parentMessageId: string, messageId: string): Promise<ChatMessage> {
        throw new Error("Method not implemented.");
    }
    watchMessage(message: ChatMessage, handler: (message: ChatMessage) => void): () => void {
        throw new Error("Method not implemented.");
    }
    modifyMessage(message: ChatMessage): Promise<void> {
        throw new Error("Method not implemented.");
    }
    notificationsChanged: Observable<Notification[]>;
    newNotification: Observable<Notification>;
    
}