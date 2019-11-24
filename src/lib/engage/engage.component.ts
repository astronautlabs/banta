import { Component, Input, ViewChild, ElementRef, HostBinding } from "@angular/core";
import { ChatMessage, ChatUser, ChatSource, NewMessageForm } from '../model';
import { Subject, BehaviorSubject, Observable } from 'rxjs';

const GENERIC_AVATAR_URL = 'https://gravatar.com/avatar/915c804e0be607a4ad766ddadea5c48a?s=512&d=https://codepen.io/assets/avatars/user-avatar-512x512-6e240cf350d2f1cc07c2bed234c3a3bb5f1b237023c204c782622e80d6b212ba.png';

const MOCK_USERS = [
    { 
        avatarUrl: GENERIC_AVATAR_URL, 
        displayName: `Tom`, 
        username: `tom` 
    }, { 
        avatarUrl: GENERIC_AVATAR_URL, 
        displayName: `Dick`, 
        username: `dick` 
    }, { 
        avatarUrl: GENERIC_AVATAR_URL, 
        displayName: `Harry`, 
        username: `harry` 
    }, { 
        avatarUrl: GENERIC_AVATAR_URL, 
        displayName: `John`, 
        username: `john` 
    }, { 
        avatarUrl: GENERIC_AVATAR_URL, 
        displayName: `Wayne`, 
        username: `wayne` 
    }, { 
        avatarUrl: GENERIC_AVATAR_URL, 
        displayName: `Heather`, 
        username: `heather` 
    }, { 
        avatarUrl: GENERIC_AVATAR_URL, 
        displayName: `Mary`, 
        username: `mary` 
    }, { 
        avatarUrl: GENERIC_AVATAR_URL, 
        displayName: `Jennifer`, 
        username: `jennifer` 
    }, { 
        avatarUrl: GENERIC_AVATAR_URL, 
        displayName: `Kyle`, 
        username: `kyle` 
    }, { 
        avatarUrl: GENERIC_AVATAR_URL, 
        displayName: `Wanda`, 
        username: `wanda` 
    }, { 
        avatarUrl: GENERIC_AVATAR_URL, 
        displayName: `Josh`, 
        username: `josh` 
    }, { 
        avatarUrl: GENERIC_AVATAR_URL, 
        displayName: `Jane`, 
        username: `jane` 
    }, { 
        avatarUrl: GENERIC_AVATAR_URL, 
        displayName: `Joy`, 
        username: `joy` 
    }, { 
        avatarUrl: GENERIC_AVATAR_URL, 
        displayName: `Jesus`, 
        username: `jesus` 
    }, { 
        avatarUrl: GENERIC_AVATAR_URL, 
        displayName: `I bathe in Bernie's tears of joy`, 
        username: `landem` 
    }, { 
        avatarUrl: GENERIC_AVATAR_URL, 
        displayName: `The thing about socialism is that its the best`, 
        username: `mangahead` 
    }, { 
        avatarUrl: GENERIC_AVATAR_URL, 
        displayName: `If only I knew the first thing about this stuff`, 
        username: `redstripe` 
    }, { 
        avatarUrl: GENERIC_AVATAR_URL, 
        displayName: `Time is not something that should be treated unfairly`, 
        username: `fantom` 
    }, { 
        avatarUrl: GENERIC_AVATAR_URL, 
        displayName: `What is the meaning of this capitalism?`, 
        username: `ganjaking` 
    }, { 
        avatarUrl: GENERIC_AVATAR_URL, 
        displayName: `The world is not ready for us`, 
        username: `leggo` 
    }, { 
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
                upvotes: 0,
                message: messageText,
                submessages: []
            }

            this.addMessage(message);
            this.messageReceived.next(message);
        }, 1000);

        this._currentUserChanged.next(this.currentUser);
    }

    currentUser : ChatUser = {
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
    private _currentUserChanged = new BehaviorSubject<ChatUser>(null);
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
                upvotes: 0,
                message: messageText,
                submessages: [
                    {
                        user: this.currentUser,
                        message: `Good point!`,
                        upvotes: 0
                    },
                    {
                        user: { 
                            avatarUrl: GENERIC_AVATAR_URL, 
                            displayName: 'FunnilyGuy', 
                            username: 'funnyguy' 
                        },
                        message: `What would this mean for Buttigieg?`,
                        upvotes: 0
                    },
                    {
                        user,
                        message: `Klobucharino`,
                        upvotes: 0
                    },
                    {
                        user: this.currentUser,
                        message: `Good question!`,
                        upvotes: 0
                    },
                    {
                        user,
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

    currentUser : ChatUser = {
        username: 'liam',
        displayName: 'Liam',
        avatarUrl: GENERIC_AVATAR_URL
    };

    private addMessage(message : ChatMessage) {
        this._messages.push(message);    
    }

    private _messages : ChatMessage[] = [];
    private _currentUserChanged = new BehaviorSubject<ChatUser>(null);
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

    private _messages : ChatMessage[] = [];
    private _messageReceived = new Subject<ChatMessage>();
    private _messageSent = new Subject<ChatMessage>();
    private _currentUserChanged: Observable<ChatUser>;

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

    send?(message: ChatMessage) {
        throw new Error("Method not implemented.");
    }


}

@Component({
    selector: `engage-chat`,
    templateUrl: './engage.component.html',
    styleUrls: [ './engage.component.scss' ]
})
export class EngageComponent {
    constructor(
    ) {
        this.firehoseSource = new MockFirehoseSource();
        this.pointSource = new MockPointSource();
    }

    firehoseSource : ChatSource;
    pointSource : ChatSource;

    @Input()
    topic : string;

    firehoseMessages : ChatMessage[] = [];
    pointedMessages : ChatMessage[] = [];

    @HostBinding('class.point-focus')
    get hasPoint() {
        return this.pointOpen != null;
    }

    pointOpen : ChatMessage = null;
    pointSubChat : ChatSource = null;

    menuMessage : ChatMessage;

    @ViewChild('firehoseMessageContainer', { static: false })
    firehoseMessageContainer : ElementRef<HTMLElement>;

    upvoteMessage(message : ChatMessage) {
        message.upvotes += 1;
    }
    
    reportMessage(message : ChatMessage) {
        alert(`reporting ${message.user.username}`)
    }

    mentionsMe(message : ChatMessage) {
        if (!this.currentUser)
            return false;

        if (message.message.includes(`@${this.currentUser.username}`))
            return true;
    }

    private addPointMessage(message : ChatMessage) {
        this.pointedMessages.unshift(message);
    }

    insertEmojiIntoFirehose(emoji) {
        if (!emoji)
            return;
        
        let existingMessage = this.newFirehoseMessage.message || '';

        this.newFirehoseMessage.message = existingMessage + emoji;
    }

    avatarForUser(user : ChatUser) {
        let url = this.genericAvatarUrl;

        if (user && user.avatarUrl)
            url = user.avatarUrl;
        
        return `url(${url})`;
    }

    private addFirehoseMessage(message : ChatMessage) {
        this.firehoseSource.send(message);

        this.firehoseMessages.push(message);
        
        if (!this.firehoseMessageContainer)
            return;

        let el = this.firehoseMessageContainer.nativeElement;
        let currentScroll = el.scrollTop;
        let currentTotal = el.scrollHeight - el.offsetHeight;
        let currentSpot = currentScroll / currentTotal;

        setTimeout(() => {
            if (!this.firehoseMessageContainer) {
                return;
            }

            if (currentScroll > currentTotal - 10) {
                // we are at the bottom
                el.scrollTop = el.scrollHeight;
            }
        }, 1);
    }

    currentUser : ChatUser = {
        username: 'liam',
        displayName: 'Liam'
    };

    newFirehoseMessage : NewMessageForm = {};
    newPointMessage : NewMessageForm = {};
    newPointSubMessage : NewMessageForm = {};

    focusOnPointMessage(message : ChatMessage) {
        this.pointOpen = message;
        this.newPointSubMessage = {};
        this.pointSubChat = new MockSubpointSource(this.pointSource, message);
    }

    newPointMessageKeyDown(event : KeyboardEvent) {
        if (event.key === 'Enter' && event.ctrlKey) {
            event.preventDefault();
            event.stopPropagation();

            this.sendPointMessage();
            return;
        }
    }

    newFirehoseMessageKeyDown(event : KeyboardEvent) {
        if (event.key === 'Enter') {
            if (event.shiftKey)
                return;
            
            event.preventDefault();
            event.stopPropagation();

            this.sendFirehoseMessage();
        }
    }

    newPointSubMessageKeyDown(event : KeyboardEvent) {
        
    }

    sendPointSubMessage() {

    }

    sendPointMessage() {
        let text = (this.newPointMessage.message || '').trim();
        this.newPointMessage.message = '';

        if (text === '')
            return;

        let message : ChatMessage = { 
            user: this.currentUser,
            upvotes: 0,
            message: text
        };

        this.addPointMessage(message);
    }

    genericAvatarUrl = 'https://gravatar.com/avatar/915c804e0be607a4ad766ddadea5c48a?s=512&d=https://codepen.io/assets/avatars/user-avatar-512x512-6e240cf350d2f1cc07c2bed234c3a3bb5f1b237023c204c782622e80d6b212ba.png';

    sendFirehoseMessage() {
        let text = (this.newFirehoseMessage.message || '').trim();
        this.newFirehoseMessage.message = '';

        if (text === '')
            return;

        let message : ChatMessage = { 
            user: this.currentUser,
            upvotes: 0,
            message: text
        };

        this.addFirehoseMessage(message);
    }
}