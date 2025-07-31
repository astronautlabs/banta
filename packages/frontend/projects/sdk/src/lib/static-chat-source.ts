import { ChatMessage, ChatPermissions, CommentsOrder, FilterMode, ServerInfo } from "@banta/common";
import { ChatSourceBase } from "./chat-source-base";
import { Observable, Subject } from "rxjs";
import { ChatBackend } from "./chat-backend";
import { ChatSourceOptions } from "./chat-backend-base";

/**
 * A special ChatSource which uses the REST API to load a limited number of chat messages, and does not support 
 * sending/editing/deleting messages, liking/unliking, or loading more messages.
 * 
 * This is used within Banta's SSR support.
 */
export class StaticChatSource implements ChatSourceBase {
    constructor(
        private backend: ChatBackend, 
        readonly identifier: string,
        readonly parentIdentifier?: string,
        options?: ChatSourceOptions
    ) {
        
        this.sortOrder = options?.sortOrder ?? CommentsOrder.NEWEST;
        this.filterMode = options?.filterMode ?? FilterMode.ALL;
        this.initialMessageCount = options?.initialMessageCount ?? 100;
    }

    initialMessageCount: number;
    sortOrder: CommentsOrder;
    filterMode: FilterMode;
    permissions: ChatPermissions; // TODO

    ready = Promise.resolve(); // TODO: should we do more than this?
    readonly = true;
    canLoadMore = false;

    messageReceived = new Subject<ChatMessage>();
    messageObserved = new Subject<ChatMessage>();
    messageUpdated = new Subject<ChatMessage>();
    messageSent = new Subject<ChatMessage>();

    messages: ChatMessage[] = [];

    async getServerInfo(): Promise<ServerInfo> {
        return {
            service: '@banta/static-chat-source',
            connections: 0,
            originId: '',
            serverId: '',
            cache: {
                topicCount: 0,
                messageCount: 0,
                topics: {}
            }
        };
    }

    async send(message: ChatMessage): Promise<ChatMessage> {
        throw new Error(`Cannot send a message in this state.`);
    }

    close() {
        // no op
    }

    async getCount() {
        if (this.parentIdentifier) {
            // TODO: We need a getReplyCount or something
            return 0;
        }

        this.backend.getSourceCountForTopic(this.identifier);
    }
    
    async loadSince(id: string) {
        return undefined;
    }

    async getExistingMessages() {
        if (this.parentIdentifier) {
            return await this.backend.getReplies(this.parentIdentifier, this.sortOrder, this.filterMode, 0, this.initialMessageCount);
        } else {
            return await this.backend.getMessages(this.identifier, this.sortOrder, this.filterMode, 0, this.initialMessageCount);
        }
    }

    async loadAfter(message: ChatMessage, count: number): Promise<ChatMessage[]> {
        return []; // no op
    }

    async get(id: string) {
        return await this.backend.getMessage(this.identifier, id);
    }

    async likeMessage(messageId: string): Promise<void> {
        throw new Error(`Cannot perform this action in this state.`);
    }

    async unlikeMessage(messageId: string): Promise<void> {
        throw new Error(`Cannot perform this action in this state.`);
    }

    async editMessage(messageId: string, text: string): Promise<void> {
        throw new Error(`Cannot perform this action in this state.`);
    }

    async deleteMessage(messageId: string): Promise<void> {
        throw new Error(`Cannot perform this action in this state.`);
    }

    connectionStateChanged = new Subject<'connected' | 'connecting' | 'lost' | 'restored'>();
    state : 'connecting' | 'connected' | 'lost' | 'restored' = 'connected';

    get errorState() {
        return undefined;
    }
}