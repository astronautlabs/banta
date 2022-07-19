import { Component, Input, ViewChild, HostBinding } from "@angular/core";
import { NewMessageForm, ChatMessage, User, Notification } from '@banta/common';
import { Subject, Observable, Subscription } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { BantaChatComponent } from '../chat';
import { Output } from "@angular/core";
import { ChatBackendBase } from "../chat-backend-base";
import { ChatSourceBase } from "../chat-source-base";

/**
 * Unified chat and comments component
 */
@Component({
    selector: `banta`,
    templateUrl: './banta.component.html',
    styleUrls: [ './banta.component.scss' ]
})
export class BantaComponent {
    constructor(
        private backend : ChatBackendBase,
        private matDialog : MatDialog
    ) {
    }

    firehoseSource : ChatSourceBase;
    pointSource : ChatSourceBase;

    private _topicID : string;
    private _subs = new Subscription();

    auxOpen = false;
    auxTitle = 'Notifications';
    auxMode = 'notifications';

    ngOnInit() {
        this._subs.add(this.backend.userChanged.subscribe(user => this.currentUser = user));
        this._subs.add(this.backend.notificationsChanged.subscribe(notifs => this.notifications = notifs));
        this._subs.add(this.backend.newNotification.subscribe(notif => {
                this.newNotifications = true;
        }));
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
    firehose : BantaChatComponent;

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
                if (this.pointSubChat.close)
                    this.pointSubChat.close();
                this.pointSubChat = null;
            }
            this.mobileFocus = 'points';
            this.pointOpen = message;
            this.pointSubChat = await this.backend.getSourceForThread(message.topicId, message.id);
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
            if (this.pointSubChat.close)
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

    @Input() chatLabel = 'Chat';
    @Input() commentsLabel = 'Comments';

    set topicID(value) {
        this._topicID = value;

        this.close();
        this.connectToTopic(this._topicID);
    }

    private async connectToTopic(id : string) {
        this.firehoseSource = await this.backend.getSourceForTopic(`${id}_firehose`);
        this.pointSource = await this.backend.getSourceForTopic(`${id}_thepoint`);
    }

    private _signInSelected = new Subject<void>();

    @Output()
    get signInSelected(): Observable<void> {
        return this._signInSelected;
    }

    showSignIn() {
        this._signInSelected.next();
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
    pointSubChat : ChatSourceBase = null;

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
        // TODO
        //await this.backend.likeMessage(message.id);
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