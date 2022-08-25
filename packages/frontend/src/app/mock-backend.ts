import { ChatMessage, User, Notification, Vote, CommentsOrder, ChatPermissions, UrlCard } from "@banta/common";
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
        this.sources.delete(`${source.identifier}:${source.sortOrder}`);
    }

    private getSourceForId(topicId: string, messageId: string, options: ChatSourceOptions) {
        let sortOrder = options?.sortOrder ?? CommentsOrder.NEWEST;

        let key = `${topicId}:${sortOrder}`;
        if (this.sources.has(key))
            return this.sources.get(key);

        let source : MockSource;

        if (messageId)
            source = new MockReplySource(this, topicId, messageId, sortOrder);
        else if (topicId.endsWith('_comments'))
            source = new MockCommentsSource(this, topicId, sortOrder);
        else if (topicId.endsWith('_chat'))
            source = new MockChatSource(this, topicId, sortOrder);

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
        public sortOrder: CommentsOrder
    ) {
        this.currentUserChanged.next(this.currentUser);
    }

    ready = Promise.resolve();
    
    currentUserChanged = new BehaviorSubject<User>(null);
    messageReceived = new Subject<ChatMessage>();
    messageUpdated = new Subject<ChatMessage>();
    messageSent = new Subject<ChatMessage>();
    messages: ChatMessage[] = [];

    async getExistingMessages(): Promise<ChatMessage[]> {
        return [];
    }

    permissions: ChatPermissions = {
        canEdit: true,
        canLike: true,
        canPost: true,
        canDelete: true
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
        readonly sortOrder: CommentsOrder,
        readonly possibleMessages : string[],
        readonly interval : number,
        readonly initialCount : number
    ) {
        super(backend, identifier, sortOrder);

        for (let i = 0; i < initialCount; ++i) {
            this.messages.push(this.generateMessage());
        }

        console.log(`[MockBackend] Opening simulated source...`);
        this._interval = setInterval(() => {
            let message = this.generateMessage();
            this.addMessage(message);
            this.messageReceived.next(message);
        }, interval);
    }

    private _interval;

    close(): void {
        console.log(`[MockBackend] Closing simulated source...`);
        clearInterval(this._interval);
    }

    protected generateMessage() {
        let messageText = this.possibleMessages[Math.floor(this.possibleMessages.length * Math.random())];
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
        readonly sortOrder: CommentsOrder
    ) {
        super(backend, identifier, sortOrder, pmq.getAll().map(x => x.quote), 3000, 8);
    }
}

export class MockCommentsSource extends SimulatedSource {
    constructor(
        readonly backend : MockBackend,
        readonly identifier : string,
        readonly sortOrder: CommentsOrder
    ) {
        super(backend, identifier, sortOrder, pmq.getAll().map(x => x.quote), 5000, 8);
    }
}

export class MockReplySource extends SimulatedSource {
    constructor(
        readonly backend : MockBackend,
        readonly identifier : string,
        readonly parentIdentifier: string,
        readonly sortOrder: CommentsOrder
    ) {
        super(backend, identifier, sortOrder, [
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
