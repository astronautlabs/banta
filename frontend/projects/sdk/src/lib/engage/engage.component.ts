import { Component, Input, ViewChild, ElementRef, HostBinding } from "@angular/core";
import { ChatMessage, User, ChatSource, NewMessageForm, ChatBackendService, Notification } from '../model';
import { Subject, BehaviorSubject, Observable } from 'rxjs';
import { SubSink } from 'subsink';
import { MatDialog } from '@angular/material/dialog';
import { FirehoseChatComponent } from '../chat';
import { BantaService } from '../common';

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
                upvotes: 0,
                message: messageText,
                submessages: []
            }

            this.addMessage(message);
            this.messageReceived.next(message);
        }, 1000);

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
                            avatarUrl: GENERIC_AVATAR_URL, 
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

@Component({
    selector: `engage-chat`,
    templateUrl: './engage.component.html',
    styleUrls: [ './engage.component.scss' ]
})
export class EngageComponent {
    constructor(
        private banta : BantaService,
        private backend : ChatBackendService,
        private matDialog : MatDialog
    ) {
        // this.firehoseSource = new MockFirehoseSource();
        // this.pointSource = new MockPointSource();
    }

    firehoseSource : ChatSource;
    pointSource : ChatSource;

    private _topicID : string;
    private _subs = new SubSink();

    auxOpen = false;
    auxTitle = 'Notifications';
    auxMode = 'notifications';

    ngOnInit() {
        this._subs.add(
            this.banta.userChanged.subscribe(user => this.currentUser = user),
            this.backend.notificationsChanged.subscribe(notifs => this.notifications = notifs),
            this.backend.newNotification.subscribe(notif => {
                this.newNotifications = true;
            })
        );
    }

    newPointSubMessageKeyDown(event : KeyboardEvent) {
        // TODO
    }
    
    mobileFocus : string = null;

    async sendPointSubMessage() {
        let text = (this.newPointSubMessage.message || '').trim();
        this.newPointSubMessage.message = '';

        if (text === '')
            return;
        
        let message : ChatMessage = {
            user: null,
            sentAt: Date.now(),
            upvotes: 0,
            message: text
        };

        try {
            await this.pointSubChat.send(message);
        } catch (e) {
            console.error(`Failed to send point sub-message:`);
            console.error(e);
        }
    }

    @ViewChild('firehose', { static: true })
    firehose : FirehoseChatComponent;

    async goToMessage(message : ChatMessage) {

        let targetMessage = message;

        if (message.parentMessageId) {
            // jump to the parent message thread...

            let parentMessage = await this.backend.getMessage(message.topicId, message.parentMessageId);

            if (!parentMessage) {
                console.error(`Failed to look up parent message ${message.topicId}/${message.parentMessageId}`);
                console.error(`Original message was:`);
                console.dir(targetMessage);
                return;
            }

            message = parentMessage;
        }

        let viewType = this.getViewType(message);

        if (viewType === 'comment') {
            if (this.pointSubChat) {
                this.pointSubChat.close();
                this.pointSubChat = null;
            }
            this.mobileFocus = 'points';
            this.pointOpen = message;
            this.pointSubChat = await this.backend.getSourceForThread(message);
            this.pointOpen = await this.backend.refreshMessage(message);
            this.newPointSubMessage = {};
        } else if (viewType === 'chat') {
            this.mobileFocus = 'firehose';
            this.firehose.jumpToMessage(message);
        }
    }

    notifications : Notification[];
    newNotifications = false;
    
    pointUnfocus() {
        this.pointOpen = null;
        if (this.pointSubChat) {
            this.pointSubChat.close();
            this.pointSubChat = null;
        }
    }

    ngOnDestroy() {
        this._subs.unsubscribe();
    }

    showAux(title : string, mode : string) {
        this.auxOpen = true;
        this.auxTitle = title;
        this.auxMode = mode;
        this.mobileFocus = 'aux';
    }

    showNotifications() {
        this.showAux('Notifications', 'notifications');
    }

    @Input()
    get topicID() : string {
        return this._topicID;
    }

    set topicID(value) {
        this._topicID = value;

        this.close();
        this.connectToTopic(this._topicID);
    }

    private async connectToTopic(id : string) {
        this.firehoseSource = await this.backend.getSourceForTopic(`${id}_firehose`);
        this.pointSource = await this.backend.getSourceForTopic(`${id}_thepoint`);
    }

    showSignIn() {
        this.showAux('Sign In', 'sign-in');
    }

    showSignUp() {
        this.showAux('Sign Up', 'sign-up');
    }

    close() {
        if (this.firehoseSource) {
            if (this.firehoseSource.close)
                this.firehoseSource.close();
            this.firehoseSource = null;
        }

        if (this.pointSource) {
            if (this.pointSource.close)
                this.pointSource.close();
            this.pointSource = null;
        }
    }

    @HostBinding('class.point-focus')
    get hasPoint() {
        return this.pointOpen != null;
    }

    pointOpen : ChatMessage = null;
    pointSubChat : ChatSource = null;

    closeAux() {
        this.auxOpen = false;
        this.mobileFocus = 'firehose';
    }

    getViewType(message : ChatMessage) {
        if (message.topicId.endsWith('_firehose'))
            return 'chat';
        else if (message.topicId.endsWith('_thepoint'))
            return 'comment';

        return 'comment';
    }

    async upvoteMessage(message : ChatMessage) {
        if (message.parentMessageId)
            await this.backend.upvoteMessage(message.topicId, message.parentMessageId, message.id);
        else
            await this.backend.upvoteMessage(message.topicId, message.id);
        //message.upvotes += 1;
    }

    showProfile(user : User) {
        this.profileUser = user;
        this.showAux(`@${user.username}'s Profile`, 'profile');
    }

    profileUser : User;
    
    reportedMessage : ChatMessage;

    sendReport(message : ChatMessage) {
        this.auxOpen = false;
        alert('would send report');
    }

    reportMessage(message : ChatMessage) {
        this.reportedMessage = message;
        this.showAux(`Report message from @${message.user.username}`, 'report');
    }

    currentUser : User;

    newPointSubMessage : NewMessageForm = {};

    genericAvatarUrl = 'https://gravatar.com/avatar/915c804e0be607a4ad766ddadea5c48a?s=512&d=https://codepen.io/assets/avatars/user-avatar-512x512-6e240cf350d2f1cc07c2bed234c3a3bb5f1b237023c204c782622e80d6b212ba.png';
}