import { Inject, Injectable } from "@angular/core";
import { ChatMessage, CommentsOrder, DurableSocket, Notification, User, Vote } from "@banta/common";
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

    get serviceUrl() {
        return `${this.options?.serviceUrl ?? 'http://localhost:3422'}`;
    }

    private async connectToService() {
        let socket = new DurableSocket(`${this.serviceUrl.replace(/^http/, 'ws')}/socket`);
        await new Promise<void>((resolve, reject) => {
            socket.onopen = () => {
                resolve();
            }

            socket.onclose = e => {
                if (e.code === 503) {
                    console.error(`Failed to connect to chat service!`);
                    reject(e);
                }
            }
        });

        socket.onerror = undefined;

        return socket;
    }

    async getSourceForTopic(topicId: string, options?: ChatSourceOptions): Promise<ChatSourceBase> {
        return await new ChatSource(this, topicId, undefined, options?.sortOrder || CommentsOrder.NEWEST)
            .bind(await this.connectToService());
    }

    async getSourceForThread(topicId: string, messageId: string, options?: ChatSourceOptions): Promise<ChatSource> {
        return await new ChatSource(this, topicId, messageId, options?.sortOrder || CommentsOrder.NEWEST)
            .bind(await this.connectToService());
    }

    async getSourceCountForTopic(topicId: string): Promise<number> {
        let response = await fetch(`${this.serviceUrl}/topics/${topicId}`)

        if (response.status >= 400)
            return 0;

        let topic = await response.json();
        return topic.messageCount || 0;
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
    notificationsChanged: Observable<Notification[]>;
    newNotification: Observable<Notification>;
    
}