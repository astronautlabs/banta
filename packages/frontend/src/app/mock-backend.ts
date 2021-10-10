import { ChatMessage, ChatSource, User, ChatBackend, Notification, Vote } from "@banta/common";
import { BehaviorSubject, Observable, Subject } from "rxjs";
import { v4 as uuid } from 'uuid';
import { Injectable } from "@angular/core";

const GENERIC_AVATAR_URL = 'https://gravatar.com/avatar/example?s=512&d=retro';

export class MockQuietSource implements ChatSource {
    constructor(
        readonly backend : MockBackend,
        readonly identifier: string
    ) {
    }

    messageReceived = new Subject<ChatMessage>();
    messageSent = new Subject<ChatMessage>();
    messages: ChatMessage[] = [];
    currentUserChanged = new Subject<User>();

    send(message: ChatMessage) {
        message.id = uuid();
        this.backend.messages.set(message.id, message);
        this.messages.push(message);
        this.messageReceived.next(message);
    }

    close() {
    }
}

@Injectable()
export class MockBackend implements ChatBackend {
    messages = new Map<string,ChatMessage>();
    userAvatars = new Map<string,string>();

    private sources = new Map<string,ChatSource>();

    private getSourceForId(id : string) {
        
        if (this.sources.has(id))
            return this.sources.get(id);

        let source : ChatSource;

        if (id.endsWith('_thepoint'))
            source = new MockPointSource(this, id);
        else
            source = new MockFirehoseSource(this, id);

        this.sources.set(id, source);
        
        return source;
    }

    async getSourceForTopic(topicId: string): Promise<ChatSource> {
        return this.getSourceForId(topicId);
    }

    async getSourceForThread(topicId: string, messageId: string): Promise<ChatSource> {
        return this.getSourceForId(topicId);
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
        // TODO
    }

    watchMessage(message: ChatMessage, handler: (message: ChatMessage) => void): () => void {
        // TODO
        return () => {};
    }

    notificationsChanged = new Subject<Notification[]>();
    newNotification = new Subject<Notification>();

}

const MOCK_USERS = [
    { 
        id: 'a',
        avatarUrl: null, 
        displayName: `Tom`, 
        username: `tom` 
    }, { 
        id: 'b',
        avatarUrl: null, 
        displayName: `Dick`, 
        username: `dick` 
    }, { 
        id: 'c',
        avatarUrl: null, 
        displayName: `Harry`, 
        username: `harry` 
    }, { 
        id: 'd',
        avatarUrl: null, 
        displayName: `John`, 
        username: `john` 
    }, { 
        id: 'e',
        avatarUrl: null, 
        displayName: `Wayne`, 
        username: `wayne` 
    }, { 
        id: 'f',
        avatarUrl: null, 
        displayName: `Heather`, 
        username: `heather` 
    }, { 
        id: 'g',
        avatarUrl: null, 
        displayName: `Mary`, 
        username: `mary` 
    }, { 
        id: 'h',
        avatarUrl: null, 
        displayName: `Jennifer`, 
        username: `jennifer` 
    }, { 
        id: 'i',
        avatarUrl: null, 
        displayName: `Kyle`, 
        username: `kyle` 
    }, { 
        id: 'j',
        avatarUrl: null, 
        displayName: `Wanda`, 
        username: `wanda` 
    }, { 
        id: 'k',
        avatarUrl: null, 
        displayName: `Josh`, 
        username: `josh` 
    }, { 
        id: 'l',
        avatarUrl: null, 
        displayName: `Jane`, 
        username: `jane` 
    }, { 
        id: 'm',
        avatarUrl: null, 
        displayName: `Joy`, 
        username: `joy` 
    }, { 
        id: 'n',
        avatarUrl: null, 
        displayName: `Jesus`, 
        username: `jesus` 
    }, { 
        id: 'o',
        avatarUrl: null, 
        displayName: `John Johnson`, 
        username: `landem` 
    }, { 
        id: 'p',
        avatarUrl: null, 
        displayName: `Fantasmo`, 
        username: `mangahead` 
    }, { 
        id: 'q',
        avatarUrl: null, 
        displayName: `If only I knew the first thing about this stuff`, 
        username: `redstripe` 
    }, { 
        id: 'r',
        avatarUrl: null, 
        displayName: `Time is not something that should be treated unfairly`, 
        username: `fantom` 
    }, { 
        id: 's',
        avatarUrl: null, 
        displayName: `What is the meaning of this capitalism?`, 
        username: `ganjaking` 
    }, { 
        id: 't',
        avatarUrl: null, 
        displayName: `The world is not ready for us`, 
        username: `leggo` 
    }, { 
        id: 'u',
        avatarUrl: null, 
        displayName: `Make or break, now is our time`, 
        username: `mako` 
    }
];

export class MockFirehoseSource implements ChatSource {
    constructor(
        readonly backend : MockBackend,
        readonly identifier : string
    ) {
        let randomMessages = [
            `Whoa!`,
            `Cool!`,
            `Nifty!`,
            `Sweet!`,
            `@liam, awesome!`,
            `Crazy!`,
            `Wunderbar!`,
            `Lasagna!`,
            `Tacos!`,
            `@liam, Life is a box of chocolates, you never know which one...`,
            `Lorem ipsum dolor sit amet! Lorem ipsum dolor sit amet! LOREM IPSUM DOLOR SIT AMET!`,
            `Lorem ipsum dolor sit amet! Lorem ipsum dolor sit amet! LOREM IPSUM DOLOR SIT AMET! The orange one makes me dislike oranges. Orange orangutan is obsolete and unoriginal! Monkeys and such. Life is a box of chocolates, you never know which one... oh fuck it. Lorem ipsum dolor sit amet! Lorem ipsum dolor sit amet! LOREM IPSUM DOLOR SIT AMET!`,
            `Delicious!`
        ];

        setInterval(() => {
            let messageText = randomMessages[Math.floor(randomMessages.length * Math.random())];
            let user = MOCK_USERS[Math.floor(MOCK_USERS.length * Math.random())];
 
            if (!user.avatarUrl)
                user.avatarUrl = `https://gravatar.com/avatar/${Date.now().toString(16)}?s=512&d=robohash`;

            let message : ChatMessage = {
                user,
                sentAt: Date.now(),
                upvotes: 0,
                message: messageText,
                submessages: []
            }

            this.addMessage(message);
            this.messageReceived.next(message);
        }, 3000);

        this._currentUserChanged.next(this.currentUser);
    }

    close() {
        // TODO
    }

    currentUser : User = {
        id: 'z',
        username: 'liam',
        displayName: 'Liam',
        avatarUrl: GENERIC_AVATAR_URL
    };

    private addMessage(message : ChatMessage) {
        this._messages.push(message);
    }

    async send(message : ChatMessage) {
        message.id = uuid();
        this.backend.messages.set(message.id, message);
        this.addMessage(message);
        this._messageSent.next(message);
    }

    private _messages : ChatMessage[] = [];
    private _currentUserChanged = new BehaviorSubject<User>(null);
    private _messageReceived = new Subject<ChatMessage>();
    private _messageSent = new Subject<ChatMessage>();
    
    get messages() {
        return this._messages;
    }

    get currentUserChanged() {
        return this._currentUserChanged;
    }

    get messageReceived() {
        return this._messageReceived;
    }

    get messageSent() {
        return this._messageSent;
    }
}

export class MockPointSource implements ChatSource {
    constructor(
        readonly backend : MockBackend,
        readonly identifier : string
    ) {
        let randomPoints = [
            `This is a great article but I have some feedback for the author.`,
            `Other things that could be said will be said`,
            `If only things were as simple as they appear`,
            `Life is a box of chocolates, you never know which one... oh fuck it`,
            `More things that are done tomorrow may not be done today`,
            `Google is a useful tool to find things`,
            `Lorem ipsum dolor sit amet! Lorem ipsum dolor sit amet! LOREM IPSUM DOLOR SIT AMET! Lorem ipsum dolor sit amet! Lorem ipsum dolor sit amet! LOREM IPSUM DOLOR SIT AMET!`
        ];

        setInterval(() => {
            let messageText = randomPoints[Math.floor(randomPoints.length * Math.random())];
            let user = MOCK_USERS[Math.floor(MOCK_USERS.length * Math.random())];

            if (!user.avatarUrl)
                user.avatarUrl = `https://gravatar.com/avatar/${Date.now().toString(16)}?s=512&d=robohash`;

            let message : ChatMessage = {
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

            this.addMessage(message);
            this.messageReceived.next(message);
        }, 5000);

        this._currentUserChanged.next(this.currentUser);
    }

    currentUser : User = {
        id: 'z',
        username: 'liam',
        displayName: 'Liam',
        avatarUrl: GENERIC_AVATAR_URL
    };

    private addMessage(message : ChatMessage) {
        this._messages.push(message);    
    }

    private _messages : ChatMessage[] = [];
    private _currentUserChanged = new BehaviorSubject<User>(null);
    private _messageReceived = new Subject<ChatMessage>();
    private _messageSent = new Subject<ChatMessage>();
    
    get messages() {
        return this._messages;
    }

    get currentUserChanged() {
        return this._currentUserChanged;
    }

    get messageReceived() {
        return this._messageReceived;
    }

    get messageSent() {
        return this._messageSent;
    }

    async send(message : ChatMessage) {
        message.id = uuid();
        this.backend.messages.set(message.id, message);
        this.addMessage(message);
        this._messageSent.next(message);
    }
}