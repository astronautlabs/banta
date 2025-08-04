import { ChatMessage, User, Notification, Vote, CommentsOrder, ChatPermissions, UrlCard, Topic, FilterMode } from "@banta/common";
import { BehaviorSubject, Observable, Subject } from "rxjs";
import { v4 as uuid } from 'uuid';
import { Injectable } from "@angular/core";
import { MOCK_USERS } from "./mock-users";
import * as pmq from 'popular-movie-quotes';
import { ChatBackendBase, ChatSourceBase, ChatSourceOptions } from "@banta/sdk";

const GENERIC_AVATAR_URL = `https://gravatar.com/avatar/${Date.now().toString(16)}?s=512&d=robohash`;

@Injectable()
export class MockBackend extends ChatBackendBase {
    messages = new Map<string, ChatMessage>();
    userAvatars = new Map<string, string>();

    private sources = new Map<string, MockSource>();

    /**
     * @internal
     */
    sourceWasClosed(source: MockSource) {
        this.sources.delete(`${source.identifier}:${source}`);
    }

    private getSourceForId(topicId: string, messageId: string, options: ChatSourceOptions = {}) {
        options.sortOrder ??= CommentsOrder.NEWEST;

        let key = `${topicId}:${options.sortOrder}`;
        if (this.sources.has(key))
            return this.sources.get(key);

        let source : MockSource;

        if (messageId)
            source = new MockReplySource(this, topicId, messageId, options);
        else if (topicId.endsWith('_comments'))
            source = new MockCommentsSource(this, topicId, options);
        else if (topicId.endsWith('_chat'))
            source = new MockChatSource(this, topicId, options);

        this.sources.set(key, source);
        return source;
    }

    async getSourceForTopic(topicId: string, options?: ChatSourceOptions): Promise<ChatSourceBase> {
        return this.getSourceForId(topicId, undefined, options);
    }

    async getSourceForThread(topicId: string, messageId: string, options?: ChatSourceOptions): Promise<ChatSourceBase> {
        return this.getSourceForId(topicId, messageId, options);
    }

    async getSourceCountForTopic(topicId: string): Promise<number> {
      return Math.floor(Math.random() * 21);
    }

    /**
     * Get the count of the given topics. 
     * @param topicId Topics to count messages on. Maximum of 1000.
     * @returns 
     */
    async getSourceCountForTopics(topicIds: string[]): Promise<Record<string, number>> {
        return Object.fromEntries(await Promise.all(topicIds.map(x => [x, this.getSourceCountForTopic(x)])));
    }

    /**
     * Get information about the given topic. 
     * @param topicId 
     * @returns The topic object, or undefined if no such topic was found.
     */
    async getTopic(topicId: string): Promise<Topic | undefined> {
        return {
            id: topicId,
            createdAt: Date.now(),
            messageCount: Math.random() * 21 | 0
        };
    }

    /**
     * Get information about the given topics
     * @param topicIds The topic IDs to look up. Maximum of 1000.
     * @returns An array of matching topic objects.
     */
    async getTopicsById(topicIds: string[]): Promise<Topic[]> {
        return await Promise.all(topicIds.map(id => this.getTopic(id)));
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
        return [];
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
        return [];
    }

    async refreshMessage(message: ChatMessage): Promise<ChatMessage> {
        return message;
    }

    async getMessage(topicId: string, messageId: string): Promise<ChatMessage> {
        return this.messages.get(messageId);
    }

    async getSubMessage(topicId: string, parentMessageId: string, messageId: string): Promise<ChatMessage> {
        return this.messages.get(messageId);
    }

    watchMessage(message: ChatMessage, handler: (message: ChatMessage) => void): () => void {
        // TODO
        return () => {};
    }

    notificationsChanged = new Subject<Notification[]>();
    newNotification = new Subject<Notification>();

    getCardForUrl(url: string): Promise<UrlCard> {
        return null;
    }
}

export class MockSource implements ChatSourceBase {
    constructor(
        readonly backend : MockBackend,
        readonly identifier: string,
        public options: ChatSourceOptions
    ) {
        this.currentUserChanged.next(this.currentUser);
    }

    ready = Promise.resolve();
    
    currentUserChanged = new BehaviorSubject<User>(null);
    messageReceived = new Subject<ChatMessage>();
    messageObserved = new Subject<ChatMessage>();
    messageUpdated = new Subject<ChatMessage>();
    messageSent = new Subject<ChatMessage>();
    messages: ChatMessage[] = [];

    async getServerInfo() {
        return {
            service: '@banta/mock-source',
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
    get errorState() {
        return undefined;
    }
    
    async loadSince(id: string) {
        return undefined;
    }
    
    async getExistingMessages(): Promise<ChatMessage[]> {
        return this.messages.slice(0, this.options.initialMessageCount);
    }

    async getPinnedMessages(): Promise<ChatMessage[]> {
        const now = Date.now();
        return this.messages.filter(x => x.pinned && (!x.pinnedUntil || x.pinnedUntil > now));
    }

    permissions: ChatPermissions = {
        canEdit: true,
        canLike: true,
        canPost: true,
        canDelete: true,
        canPin: true
    }
    async getCount() {
        return 0; // TODO
    }

    async editMessage(messageId: string, text: string) : Promise<void> {
        this.backend.messages.get(messageId).message = text;
    }

    async deleteMessage(messageId: string) {
        this.backend.messages.delete(messageId);
    }

    async get(id: string) {
        return this.backend.messages.get(id);
    }

    async likeMessage(messageId: string): Promise<void> {
        let message = this.backend.messages.get(messageId);
        if (!message) {
            throw new Error(`No such message`);
        }

        // The UI will increment the like count early for quick user response.
        // We need to maintain a fake "source of truth" for the likes.
        
        if (!message['$likes'])
            message['$likes'] = 0;

        message['$likes'] += 1;
        message.likes = message['$likes'];
    }

    async pinMessage(messageId: string, options: { until?: number }): Promise<void> {
        let message = this.backend.messages.get(messageId);
        if (!message) {
            throw new Error(`No such message`);
        }

        message.pinned = true;
        message.pinnedUntil = options?.until;
    }

    async unpinMessage(messageId: string): Promise<void> {
        let message = this.backend.messages.get(messageId);
        if (!message) {
            throw new Error(`No such message`);
        }

        message.pinned = false;
        message.pinnedUntil = undefined;
    }


    async loadAfter(message: ChatMessage, count: number) {
        return [];
    }

    async unlikeMessage(messageId: string): Promise<void> {
        let message = this.backend.messages.get(messageId);
        if (!message) {
            throw new Error(`No such message`);
        }

        // The UI will increment the like count early for quick user response.
        // We need to maintain a fake "source of truth" for the likes.
        
        if (!message['$likes'])
            message['$likes'] = 0;

        message['$likes'] -= 1;
        message.likes = message['$likes'];
    }

    async send(message: ChatMessage) {
        if (message.message.includes('#error'))
            throw new Error(`An error has occurred`);

        if (message.message.includes('#timeout'))
            await new Promise<void>((_, reject) => setTimeout(() => reject(new Error(`Timeout`)), 7000));

        if (message.message.includes('#slow'))
            await new Promise<void>(resolve => setTimeout(() => resolve(), 5000));

        message.id = uuid();
        this.addMessage(message);
        this.backend.messages.set(message.id, message);
        this.messages.push(message);
        //this.messageSent.next(message);
        this.messageReceived.next(message);

        return message;
    }

    close() {
        this.backend.sourceWasClosed(this);
    }

    private _currentUser : User = {
        id: 'z',
        username: 'liam',
        displayName: 'Liam',
        avatarUrl: GENERIC_AVATAR_URL
    };

    get currentUser() {
        return this._currentUser;
    }

    set currentUser(value) {
        this._currentUser = value;
        setTimeout(() => this.currentUserChanged.next(this._currentUser));
    }

    protected addMessage(message : ChatMessage) {
        this.messages.push(message);
        this.backend.messages.set(message.id, message);
    }



}

export class SimulatedSource extends MockSource {
    constructor(
        readonly backend : MockBackend,
        readonly identifier : string,
        readonly options: ChatSourceOptions,
        readonly possibleMessages : string[],
        readonly interval : number,
        readonly initialCount : number
    ) {
        super(backend, identifier, options);

        for (let i = 0; i < initialCount; ++i) {
            this.messages.push(this.generateMessage(`Message ${i}`));
        }

        console.log(`[MockBackend] Opening simulated source...`);
        if (interval > 0) {
            this._interval = setInterval(() => {
                let message = this.generateMessage();
                this.addMessage(message);
                this.messageReceived.next(message);
            }, interval);
        }
    }

    private _interval;

    close(): void {
        console.log(`[MockBackend] Closing simulated source...`);
        clearInterval(this._interval);
    }

    protected generateMessage(messageText?: string | undefined) {
        messageText ??= this.possibleMessages[Math.floor(this.possibleMessages.length * Math.random())];
        let user = MOCK_USERS[Math.floor(MOCK_USERS.length * Math.random())];

        if (!user.avatarUrl)
            user.avatarUrl = `https://gravatar.com/avatar/${Date.now().toString(16)}?s=512&d=robohash`;

        let message = <ChatMessage>{
            id: uuid(),
            user,
            sentAt: Date.now(),
            likes: 0,
            message: messageText,
            submessages: [
                {
                    user: this.currentUser,
                    message: `Good point!`,
                    sentAt: Date.now(),
                    likes: 0
                },
                {
                    user: {
                        id: 'aa',
                        avatarUrl: null,
                        displayName: 'FunnilyGuy',
                        username: 'funnyguy'
                    },
                    sentAt: Date.now(),
                    message: `What would this mean for Buttigieg?`,
                    likes: 0
                },
                {
                    user,
                    sentAt: Date.now(),
                    message: `Klobucharino`,
                    likes: 0
                },
                {
                    user: this.currentUser,
                    sentAt: Date.now(),
                    message: `Good question!`,
                    likes: 0
                },
                {
                    user,
                    sentAt: Date.now(),
                    message: `But whyigieg`,
                    likes: 0
                }
            ]
        }

        this.backend.messages.set(message.id, message);

        return message;
    }

    async loadAfter(message : ChatMessage, count : number): Promise<ChatMessage[]> {
        return await new Promise(resolve => {
            setTimeout(() => {
                resolve([
                    this.generateMessage(),
                    this.generateMessage(),
                    this.generateMessage(),
                    this.generateMessage(),
                    this.generateMessage(),
                    this.generateMessage(),
                    this.generateMessage(),
                    this.generateMessage(),
                    this.generateMessage(),
                    this.generateMessage(),
                    this.generateMessage(),
                    this.generateMessage(),
                    this.generateMessage()
                ]);
            }, 3000);
        });
    }
}

export class MockChatSource extends SimulatedSource {
    constructor(
        readonly backend : MockBackend,
        readonly identifier : string,
        readonly options: ChatSourceOptions
    ) {
        super(backend, identifier, options, pmq.getAll().map(x => x.quote), 3000, 8);
    }
}

export class MockCommentsSource extends SimulatedSource {
    constructor(
        readonly backend : MockBackend,
        readonly identifier : string,
        readonly options: ChatSourceOptions
    ) {
        super(backend, identifier, options, pmq.getAll().map(x => x.quote), -1, 100);
    }
}

export class MockReplySource extends SimulatedSource {
    constructor(
        readonly backend : MockBackend,
        readonly identifier : string,
        readonly parentIdentifier: string,
        readonly options: ChatSourceOptions
    ) {
        super(backend, identifier, options, [
            `Good point.`,
            `Do you have a blog?`,
            `Not sure this is such a great take tbh`,
            `lmao :-D`,
            `??`,
            `Interesting!`,
            `Huh.`
        ], 12000, 1);
    }
}
