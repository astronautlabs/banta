import { ChatMessage, ChatSource, User, ChatBackend, Notification, Vote, ChatSourceOptions, CommentsOrder, CDNProvider } from "@banta/common";
import { BehaviorSubject, Observable, Subject } from "rxjs";
import { v4 as uuid } from 'uuid';
import { Injectable } from "@angular/core";
import { MOCK_USERS } from "./mock-users";
import * as pmq from 'popular-movie-quotes';

const GENERIC_AVATAR_URL = `https://gravatar.com/avatar/${Date.now().toString(16)}?s=512&d=robohash`;

@Injectable()
export class MockBackend implements ChatBackend {
    messages = new Map<string, ChatMessage>();
    userAvatars = new Map<string, string>();

    private sources = new Map<string, ChatSource>();

    /**
     * @internal
     */
    sourceWasClosed(source: MockSource) {
        this.sources.delete(`${source.identifier}:${source.sortOrder}`);
    }

    private getSourceForId(id : string, options: ChatSourceOptions) {

        let key = `${id}:${options.sortOrder}`;
        if (this.sources.has(key))
            return this.sources.get(key);

        let source : ChatSource;

        if (id.endsWith('_comments'))
            source = new MockCommentsSource(this, id, options.sortOrder ?? CommentsOrder.NEWEST);
        else if (id.endsWith('_chat'))
            source = new MockChatSource(this, id, options.sortOrder ?? CommentsOrder.NEWEST);
        else if (id.endsWith('_replies'))
            source = new MockReplySource(this, id, options.sortOrder ?? CommentsOrder.NEWEST);

        this.sources.set(key, source);
        return source;
    }

    async getSourceForTopic(topicId: string, options?: ChatSourceOptions): Promise<ChatSource> {
        return this.getSourceForId(topicId, options);
    }

    async getSourceForThread(topicId: string, messageId: string, options?: ChatSourceOptions): Promise<ChatSource> {
        return this.getSourceForId(messageId, options);
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

    async upvoteMessage(topicId: string, messageId: string, submessageId: string, vote: Vote): Promise<void> {
        let message = this.messages.get(messageId);
        if (!message) {
            throw new Error(`No such message`);
        }

        if (!message.upvotes)
            message.upvotes = 0;

        message.upvotes += 1;
    }

    watchMessage(message: ChatMessage, handler: (message: ChatMessage) => void): () => void {
        // TODO
        return () => {};
    }

    notificationsChanged = new Subject<Notification[]>();
    newNotification = new Subject<Notification>();

}

export class MockSource implements ChatSource {
    constructor(
        readonly backend : MockBackend,
        readonly identifier: string,
        public sortOrder: CommentsOrder
    ) {
        this.currentUserChanged.next(this.currentUser);
    }

    currentUserChanged = new BehaviorSubject<User>(null);
    messageReceived = new Subject<ChatMessage>();
    messageSent = new Subject<ChatMessage>();
    messages: ChatMessage[] = [];

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
            id: `${uuid()}_replies`,
            user,
            sentAt: Date.now(),
            upvotes: 0,
            message: messageText,
            submessages: [
                {
                    user: this.currentUser,
                    message: `Good point!`,
                    sentAt: Date.now(),
                    upvotes: 0
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
                    upvotes: 0
                },
                {
                    user,
                    sentAt: Date.now(),
                    message: `Klobucharino`,
                    upvotes: 0
                },
                {
                    user: this.currentUser,
                    sentAt: Date.now(),
                    message: `Good question!`,
                    upvotes: 0
                },
                {
                    user,
                    sentAt: Date.now(),
                    message: `But whyigieg`,
                    upvotes: 0
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
