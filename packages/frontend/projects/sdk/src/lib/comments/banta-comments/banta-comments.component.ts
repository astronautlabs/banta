import { Component, ElementRef, Input, Output } from '@angular/core';
import { User, ChatSource, ChatMessage, UserAccount } from '@banta/common';
import { HashTag } from '../comment-field/comment-field.component';
import { Subject, Observable } from 'rxjs';
import { SubSink } from 'subsink';
import { ChatBackendService } from '../../common';
import { BantaService } from '../../common';

/**
 * Comments component
 */
@Component({
    selector: 'banta-comments',
    templateUrl: './banta-comments.component.html',
    styleUrls: ['./banta-comments.component.scss']
})
export class BantaCommentsComponent {
    constructor(
        private banta : BantaService,
        private backend : ChatBackendService,
        private elementRef : ElementRef<HTMLElement>
    ) {
    }

    private _upvoted = new Subject<ChatMessage>();
    private _reported = new Subject<ChatMessage>();
    private _selected = new Subject<ChatMessage>();
    private _userSelected = new Subject<ChatMessage>();
    private _source : ChatSource;

    private _subs = new SubSink();

    @Input() hashtags : HashTag[] = [
        { hashtag: 'error', description: 'Cause an error' },
        { hashtag: 'timeout', description: 'Cause a slow timeout error' },
        { hashtag: 'slow', description: 'Be slow when this message is posted' },
    ];

    @Input() participants : User[] = [];

    ngOnInit() {
        this._subs.add(
            this.banta.userChanged.subscribe(user => this.user = user)
        )
    }

    ngOnDestroy() {
        this._subs.unsubscribe();
    }

    @Input()
    get source() : ChatSource {
        return this._source;
    }

    set source(value) {
        this._source = value;
    }

    @Input() fixedHeight : boolean;
    @Input() maxMessages : number;
    @Input() maxVisibleMessages : number;
    @Input() genericAvatarUrl : string;

    @Input()
    get topicID() : string {
        return this._source.identifier;
    }

    set topicID(value) {
        this.setSourceFromTopicID(value);
    }

    private async setSourceFromTopicID(topicID : string) {
        if (this._source && this._source.close)
            this._source.close();
        this._source = null;
        this._source = await this.backend.getSourceForTopic(topicID);

        this._source.messageReceived.subscribe(m => this.addParticipant(m));
        this._source.messageSent.subscribe(m => this.addParticipant(m));
        this._source.messages.forEach(m => this.addParticipant(m));
    }

    private addParticipant(message : ChatMessage) {
        if (!message || !message.user || !message.user.id)
            return;

        let existing = this.participants.find(x => x.id === message.user.id);
        if (existing)
            return;
        this.participants.push(message.user);
    }

    showSignIn() {
        this._signInSelected.next();
    }

    showEditAvatar() {
        this._editAvatarSelected.next();
    }

    user : UserAccount;
    
    private _newMessageText : string;

    get newMessageText(): string {
        return this._newMessageText;
    }

    set newMessageText(value) {
        this._newMessageText = value;
        if (this._newMessageText === '' && this.sendError) 
            setTimeout(() => this.sendError = null);
    }

    @Input() signInLabel = 'Sign In';
    @Input() sendLabel = 'Send';
    @Input() replyLabel = 'Reply'; 
    @Input() sendingLabel = 'Sending';
    @Input() permissionDeniedLabel = 'Send';
    @Input() postCommentLabel = 'Post a comment';
    @Input() postReplyLabel = 'Post a reply';

    private _signInSelected = new Subject<void>();
    private _permissionDeniedError = new Subject<void>();
    private _editAvatarSelected = new Subject<void>();

    @Output()
    get signInSelected(): Observable<void> {
        return this._signInSelected;
    }

    @Output()
    get editAvatarSelected() {
        return this._editAvatarSelected;
    }

    @Output()
    get permissionDeniedError(): Observable<void> {
        return this._permissionDeniedError;
    }

    showPermissionDenied() {
        this._permissionDeniedError.next();
    }
    
    get canComment() {
        if (!this.user)
            return false;
        
        if (!this.user.permissions)
            return true;
        
        if (!this.user.permissions.canComment)
            return true;
        
        return this.user.permissions?.canComment(this.source);
    }

    @Output()
    get upvoted() {
        return this._upvoted;
    }
    
    @Output()
    get reported() {
        return this._reported;
    }

    @Output()
    get selected() {
        return this._selected;
    }
    @Output()
    get userSelected() {
        return this._userSelected;
    }

    onKeyDown(event : KeyboardEvent) {
    }

    insertEmoji(text : string) {
        this.newMessageText += text;
    }

    onReplyKeyDown(event : KeyboardEvent) {
    }

    insertReplyEmoji(text : string) {
        this.replyMessage += text;
    }

    sending = false;
    sendError : Error;
    expandError = false;

    indicateError(message : string) {
        this.sendError = new Error(message);
        setTimeout(() => {
            this.expandError = true;
            setTimeout(() => {
                this.expandError = false;
            }, 5*1000);
        });
    }

    async sendMessage() {
        if (!this.source)
            return;
        
        this.sending = true;
        this.sendError = null;
        try {
            let text = (this.newMessageText || '').trim();

            if (text === '')
                return;

            let message : ChatMessage = {
                user: this.user,
                sentAt: Date.now(),
                upvotes: 0,
                message: text
            };

            try {
                await this.source.send(message);
                this.newMessageText = '';
            } catch (e) {
                this.indicateError(`Could not send: ${e.message}`);
                console.error(`Failed to send message: `, message);
                console.error(e);
            }
        } finally {
            this.sending = false;
        }
    }

    async upvoteMessage(message : ChatMessage) {
        this._upvoted.next(message);
        await this.backend.upvoteMessage(message.topicId, message.parentMessageId ? message.parentMessageId : message.id, message.parentMessageId ? message.id : undefined);
    }

    reportMessage(message : ChatMessage) {
        this._reported.next(message);
    }

    selectedMessage : ChatMessage;
    selectedMessageThread : ChatSource;

    replyMessage : string;

    async unselectMessage() {
        let message = this.selectedMessage;
        
        this._selected.next(null);
        this.selectedMessage = null;
        if (this.selectedMessageThread) {
            if (this.selectedMessageThread.close)
                this.selectedMessageThread.close();
            this.selectedMessageThread = null;
        }

        if (message)
            setTimeout(() => this.scrollToMessage(message));
    }

    selectedMessageVisible = false;

    async selectMessage(message : ChatMessage) {
        this._selected.next(message);
        this.selectedMessage = message;
        setTimeout(() => this.selectedMessageVisible = true);
        setTimeout(async () => {
            this.selectedMessageThread = await this.backend.getSourceForThread(this.topicID, message.id);
        }, 250);
    }

    selectMessageUser(message : ChatMessage) {
        this._userSelected.next(message);
    }

    async sendReply() {
        await this.selectedMessageThread.send({
            message: this.replyMessage,
            parentMessageId: this.selectedMessage.id,
            upvotes: 0,
            user: this.user,
            submessages: [],
            topicId: this.topicID,
            sentAt: Date.now(),
            updatedAt: Date.now()
        })
        this.replyMessage = '';
    }

    scrollToMessage(message : ChatMessage) {
        let el = this.elementRef.nativeElement.querySelector(`[data-comment-id="${message.id}"]`);
        if (!el)
            return;
        el.scrollIntoView({ block: 'center', inline: 'start' });
    }
}