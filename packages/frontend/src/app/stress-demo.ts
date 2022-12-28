import { ChatMessage, ChatSource, User } from "@banta/common";
import { BehaviorSubject, Observable, Subject } from "rxjs";

const GENERIC_AVATAR_URL = 'https://gravatar.com/avatar/915c804e0be607a4ad766ddadea5c48a?s=512&d=https://codepen.io/assets/avatars/user-avatar-512x512-6e240cf350d2f1cc07c2bed234c3a3bb5f1b237023c204c782622e80d6b212ba.png';

const MOCK_USERS = [
    { 
        id: 'a',
        avatarUrl: GENERIC_AVATAR_URL, 
        displayName: `Tom`, 
        username: `tom` 
    }, { 
        id: 'b',
        avatarUrl: GENERIC_AVATAR_URL, 
        displayName: `Dick`, 
        username: `dick` 
    }, { 
        id: 'c',
        avatarUrl: GENERIC_AVATAR_URL, 
        displayName: `Harry`, 
        username: `harry` 
    }, { 
        id: 'd',
        avatarUrl: GENERIC_AVATAR_URL, 
        displayName: `John`, 
        username: `john` 
    }, { 
        id: 'e',
        avatarUrl: GENERIC_AVATAR_URL, 
        displayName: `Wayne`, 
        username: `wayne` 
    }, { 
        id: 'f',
        avatarUrl: GENERIC_AVATAR_URL, 
        displayName: `Heather`, 
        username: `heather` 
    }, { 
        id: 'g',
        avatarUrl: GENERIC_AVATAR_URL, 
        displayName: `Mary`, 
        username: `mary` 
    }, { 
        id: 'h',
        avatarUrl: GENERIC_AVATAR_URL, 
        displayName: `Jennifer`, 
        username: `jennifer` 
    }, { 
        id: 'i',
        avatarUrl: GENERIC_AVATAR_URL, 
        displayName: `Kyle`, 
        username: `kyle` 
    }, { 
        id: 'j',
        avatarUrl: GENERIC_AVATAR_URL, 
        displayName: `Wanda`, 
        username: `wanda` 
    }, { 
        id: 'k',
        avatarUrl: GENERIC_AVATAR_URL, 
        displayName: `Josh`, 
        username: `josh` 
    }, { 
        id: 'l',
        avatarUrl: GENERIC_AVATAR_URL, 
        displayName: `Jane`, 
        username: `jane` 
    }, { 
        id: 'm',
        avatarUrl: GENERIC_AVATAR_URL, 
        displayName: `Joy`, 
        username: `joy` 
    }, { 
        id: 'n',
        avatarUrl: GENERIC_AVATAR_URL, 
        displayName: `Jesus`, 
        username: `jesus` 
    }, { 
        id: 'o',
        avatarUrl: GENERIC_AVATAR_URL, 
        displayName: `I bathe in Bernie's tears of joy`, 
        username: `landem` 
    }, { 
        id: 'p',
        avatarUrl: GENERIC_AVATAR_URL, 
        displayName: `The thing about socialism is that its the best`, 
        username: `mangahead` 
    }, { 
        id: 'q',
        avatarUrl: GENERIC_AVATAR_URL, 
        displayName: `If only I knew the first thing about this stuff`, 
        username: `redstripe` 
    }, { 
        id: 'r',
        avatarUrl: GENERIC_AVATAR_URL, 
        displayName: `Time is not something that should be treated unfairly`, 
        username: `fantom` 
    }, { 
        id: 's',
        avatarUrl: GENERIC_AVATAR_URL, 
        displayName: `What is the meaning of this capitalism?`, 
        username: `ganjaking` 
    }, { 
        id: 't',
        avatarUrl: GENERIC_AVATAR_URL, 
        displayName: `The world is not ready for us`, 
        username: `leggo` 
    }, { 
        id: 'u',
        avatarUrl: GENERIC_AVATAR_URL, 
        displayName: `Make or break, now is our time`, 
        username: `mako` 
    }
];

export class MockFirehoseSource implements ChatSource {
    constructor() {
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
            `@liam, Life is a box of chocolates, you never know which one... oh fuck it`,
            `Lorem ipsum dolor sit amet! Lorem ipsum dolor sit amet! LOREM IPSUM DOLOR SIT AMET GDI!`,
            `Lorem ipsum dolor sit amet! Lorem ipsum dolor sit amet! LOREM IPSUM DOLOR SIT AMET GDI! The orange one makes me dislike oranges. Orange orangutan is obsolete and unoriginal! Monkeys and such. Life is a box of chocolates, you never know which one... oh fuck it. Lorem ipsum dolor sit amet! Lorem ipsum dolor sit amet! LOREM IPSUM DOLOR SIT AMET GDI!`,
            `The orange one makes me dislike oranges. Orange orangutan is obsolete and unoriginal! Monkeys and such.`
        ];

        setInterval(() => {
            let messageText = randomMessages[Math.floor(randomMessages.length * Math.random())];
            let user = MOCK_USERS[Math.floor(MOCK_USERS.length * Math.random())];

            let message : ChatMessage = {
                user,
                sentAt: Date.now(),
                likes: 0,
                message: messageText,
                submessages: []
            }

            this.addMessage(message);
            this.messageReceived.next(message);
        }, 1000);

        this._currentUserChanged.next(this.currentUser);
    }

    identifier = 'mock';

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

    send(message : ChatMessage) {
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
    constructor() {
        let randomPoints = [
            `I think that Trump has a specific form of braindead called
            "Trumpitis".`,
            `Other things that could be said will be said`,
            `If only things were as simple as they appear`,
            `Life is a box of chocolates, you never know which one... oh fuck it`,
            `More things that are done tomorrow may not be done today`,
            `Google is a useful tool to find things`,
            `Lorem ipsum dolor sit amet! Lorem ipsum dolor sit amet! LOREM IPSUM DOLOR SIT AMET GDI! The orange one makes me dislike oranges. Orange orangutan is obsolete and unoriginal! Monkeys and such. Life is a box of chocolates, you never know which one... oh fuck it. Lorem ipsum dolor sit amet! Lorem ipsum dolor sit amet! LOREM IPSUM DOLOR SIT AMET GDI! Lorem ipsum dolor sit amet! Lorem ipsum dolor sit amet! LOREM IPSUM DOLOR SIT AMET GDI! The orange one makes me dislike oranges. Orange orangutan is obsolete and unoriginal! Monkeys and such. Life is a box of chocolates, you never know which one... oh fuck it. Lorem ipsum dolor sit amet! Lorem ipsum dolor sit amet! LOREM IPSUM DOLOR SIT AMET GDI! Lorem ipsum dolor sit amet! Lorem ipsum dolor sit amet! LOREM IPSUM DOLOR SIT AMET GDI! The orange one makes me dislike oranges. Orange orangutan is obsolete and unoriginal! Monkeys and such. Life is a box of chocolates, you never know which one... oh fuck it. Lorem ipsum dolor sit amet! Lorem ipsum dolor sit amet! LOREM IPSUM DOLOR SIT AMET GDI! Lorem ipsum dolor sit amet! Lorem ipsum dolor sit amet! LOREM IPSUM DOLOR SIT AMET GDI! The orange one makes me dislike oranges. Orange orangutan is obsolete and unoriginal! Monkeys and such. Life is a box of chocolates, you never know which one... oh fuck it. Lorem ipsum dolor sit amet! Lorem ipsum dolor sit amet! LOREM IPSUM DOLOR SIT AMET GDI!`
        ];

        setInterval(() => {
            let messageText = randomPoints[Math.floor(randomPoints.length * Math.random())];
            let user = MOCK_USERS[Math.floor(MOCK_USERS.length * Math.random())];

            let message : ChatMessage = {
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
                            avatarUrl: GENERIC_AVATAR_URL, 
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

            this.addMessage(message);
            this.messageReceived.next(message);
        }, 5000);

        this._currentUserChanged.next(this.currentUser);
    }

    identifier = 'mock-point';

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

    send(message : ChatMessage) {
        this.addMessage(message);
        this._messageSent.next(message);
    }
}

export class MockSubpointSource implements ChatSource {
    constructor(
        readonly parentSource : ChatSource,
        readonly message : ChatMessage
    ) {
        this._currentUserChanged = parentSource.currentUserChanged;
        this._messages = message.submessages;
    }

    identifier = 'mock-subpoint';

    private _messages : ChatMessage[] = [];
    private _messageReceived = new Subject<ChatMessage>();
    private _messageSent = new Subject<ChatMessage>();
    private _currentUserChanged: Observable<User>;

    get messages() {
        return this._messages;
    }

    get messageReceived() {
        return this._messageReceived;
    }

    get messageSent() {
        return this._messageSent;
    }

    get currentUserChanged() {
        return this._currentUserChanged;
    }

    send(message: ChatMessage) {
        //throw new Error("Method not implemented.");
    }


}
