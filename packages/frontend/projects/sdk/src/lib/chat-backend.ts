import { Inject, Injectable } from "@angular/core";
import { ChatMessage, CommentsOrder, DurableSocket, FilterMode, Notification, Topic, UrlCard, User, Vote, buildQuery } from "@banta/common";
import { Observable } from "rxjs";
import { ChatBackendBase, ChatSourceOptions } from "./chat-backend-base";
import { ChatSource } from "./chat-source";
import { ChatSourceBase } from "./chat-source-base";
import { BANTA_SDK_OPTIONS, SdkOptions } from "./sdk-options";
import { PLATFORM_ID } from "@angular/core";
import { isPlatformServer } from "@angular/common";
import { StaticChatSource } from "./static-chat-source";

@Injectable()
export class ChatBackend extends ChatBackendBase {
    constructor(
        @Inject(BANTA_SDK_OPTIONS) private options: SdkOptions,
        @Inject(PLATFORM_ID) private platformId
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

    private isServer() {
        if (typeof localStorage !== 'undefined' && localStorage['banta:debug:useStaticSource'] === '1')
            return true;

        return isPlatformServer(this.platformId);
    }

    /**
     * Check if we are currently running inside a Googlebot user agent or via the Google inspection tool in Search Console.
     * We'll use this to avoid WebSockets so that comments can be indexable.
     * @returns 
     */
    private isGooglebot() {
        return typeof navigator !== 'undefined' && (
            navigator.userAgent.includes('Googlebot')
            || navigator.userAgent.includes('Google-InspectionTool')
        );
    }

    async getSourceForTopic(topicId: string, options?: ChatSourceOptions): Promise<ChatSourceBase> {
        // In some cases we need to do a single REST request to fetch the messages 
        // and not use Banta's socket RPC since the open ended lifetime of a WebSocket connection 
        // does not match the use case.
        // - When running in SSR
        // - When running in Googlebot (Googlebot also doesn't support WebSockets anyway)

        if (this.isServer() || this.isGooglebot()) {
            return new StaticChatSource(this, topicId, undefined, options);
        } else {
            return await new ChatSource(this, topicId, undefined, { sortOrder: CommentsOrder.NEWEST, filterMode: FilterMode.ALL, ...options })
                .bind(await this.connectToService());
        }
    }

    async getSourceForThread(topicId: string, messageId: string, options?: ChatSourceOptions): Promise<ChatSourceBase> {
        // When running on the server platform, we're just going to do a single REST request to fetch the messages 
        // and not use Banta's socket RPC.
        
        if (this.isServer()) {
            return new StaticChatSource(this, topicId, messageId, options);
        } else {
            return await new ChatSource(this, topicId, messageId, { sortOrder: CommentsOrder.NEWEST, filterMode: FilterMode.ALL, ...options })
                .bind(await this.connectToService());
        }
    }

    /**
     * Get the count of the given topic
     * @param topicId 
     * @returns 
     */
    async getSourceCountForTopic(topicId: string): Promise<number> {
        try {
            let topic = await this.getTopic(topicId);
            return topic?.messageCount ?? 0;
        } catch (e) {
            console.error(`[Banta/${topicId}] Failed to get message count for topic:`);
            console.error(e);
            return undefined;
        }
    }

    /**
     * Get the count of the given topics. 
     * @param topicId Topics to count messages on. Maximum of 1000.
     * @returns 
     */
    async getSourceCountForTopics(topicIds: string[]): Promise<Record<string, number>> {
        try {
            let topics = await this.getTopicsById(topicIds);
            return Object.fromEntries(topics.map(topic => [ topic.id, topic.messageCount ?? 0 ]));
        } catch (e) {
            console.error(`[Banta/Topics] Failed to get message count for topics '${topicIds.join(',')}]':`);
            console.error(e);
            return undefined;
        }
    }

    /**
     * Get information about the given topic. 
     * @param topicId 
     * @returns The topic object, or undefined if no such topic was found.
     */
    async getTopic(topicId: string): Promise<Topic | undefined> {
        let response = await fetch(`${this.serviceUrl}/topics/${topicId}`)
        if (response.status === 404)
            return undefined;
        if (response.status >= 400)
            throw new Error(`Failed to fetch topic: ${response.status}`)

        return <Topic> await response.json();
    }

    /**
     * Get information about the given topics
     * @param topicIds The topic IDs to look up. Maximum of 1000.
     * @returns An array of matching topic objects.
     */
    async getTopicsById(topicIds: string[]): Promise<Topic[]> {
        if (topicIds.length > 1000)
            throw new Error(`Cannot look up more than 1000 topics at a time.`);

        let response = await fetch(`${this.serviceUrl}/topics?ids=${encodeURIComponent(topicIds.join(','))}`)
        if (response.status >= 400)
            throw new Error(`Failed to fetch topic: ${response.status}`)

        return <Topic[]> await response.json();
    }

    /**
     * Get a set of messages from the given topic.
     * @param topicId 
     * @returns 
     */
    async getMessages(
        topicId: string, 
        sort?: CommentsOrder, 
        filter?: FilterMode, 
        offset?: number, 
        limit?: number
    ): Promise<ChatMessage[]> {
        let response = await fetch(
            `${this.serviceUrl}/topics/${topicId}/messages?${ buildQuery({ sort, filter, offset, limit }) }`
        );

        if (response.status >= 400)
            throw new Error(`Failed to fetch messages for topic: ${response.status}`)

        return <ChatMessage[]> await response.json();
    }

    /**
     * Get a set of messages from the given topic.
     * @param topicId 
     * @returns 
     */
    async getReplies(
        parentMessageId: string,
        sort?: CommentsOrder, 
        filter?: FilterMode, 
        offset?: number, 
        limit?: number
    ): Promise<ChatMessage[]> {
        let response = await fetch(
            `${this.serviceUrl}/messages/${parentMessageId}/replies?${ buildQuery({ sort, filter, offset, limit }) }`
        );

        if (response.status >= 400)
            throw new Error(`Failed to fetch replies: ${response.status}`)

        return <ChatMessage[]> await response.json();
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
    
    async getCardForUrl(url: string): Promise<UrlCard> {
        let response = await fetch(`${this.serviceUrl}/urls`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url
            })
        });

        if (response.status == 404)
            return null;
        
        if (response.status >= 400)
            throw new Error(`Failed to retrieve URL card: ${response.status}. Body: '${await response.text()}'`);

        return await response.json();
    }
}