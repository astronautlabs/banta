import { AfterViewInit, Component, ElementRef, Input, Output } from '@angular/core';
import { User, ChatSource, ChatMessage, UserAccount, CommentsOrder } from '@banta/common';
import { HashTag } from '../comment-field/comment-field.component';
import { Subject, Observable, Subscription } from 'rxjs';
import { ChatBackendService } from '../../common';
import { BantaService } from '../../common';
import { ActivatedRoute } from '@angular/router';

/**
 * Comments component
 */
@Component({
    selector: 'banta-comments',
    templateUrl: './banta-comments.component.html',
    styleUrls: ['./banta-comments.component.scss']
})
export class BantaCommentsComponent implements AfterViewInit {
    constructor(
        private banta: BantaService,
        private backend: ChatBackendService,
        private elementRef: ElementRef<HTMLElement>,
        private activatedRoute: ActivatedRoute
    ) {
    }

    private _upvoted = new Subject<ChatMessage>();
    private _reported = new Subject<ChatMessage>();
    private _selected = new Subject<ChatMessage>();
    private _userSelected = new Subject<ChatMessage>();
    private _shared = new Subject<ChatMessage>();

    private _usernameSelected = new Subject<User>();
    private _avatarSelected = new Subject<User>();

    private _source: ChatSource;

    private _subs = new Subscription();

    _sortOrder: CommentsOrder;

    get sortOrder() {
        return this._sortOrder;
    }

    set sortOrder(value) {
        if (this._sortOrder !== value) {
            this._sortOrder = value;
            setTimeout(() => {
                this.setSourceFromTopicID(this.topicID);
            });
        }
    }

    @Input() hashtags: HashTag[] = [
        {hashtag: 'error', description: 'Cause an error'},
        {hashtag: 'timeout', description: 'Cause a slow timeout error'},
        {hashtag: 'slow', description: 'Be slow when this message is posted'},
    ];

    @Input() participants: User[] = [];

    ngOnInit() {
        this._subs.add(
            this.banta.userChanged.subscribe(user => this.user = user)
        );
    }

    ngAfterViewInit() {
        if (typeof window !== 'undefined') this.checkForSharedComment();
    }

    scrollToComment(commentId: ChatMessage['id']): void {
        setTimeout(() => {
          const comment = document.querySelectorAll(`[data-comment-id="${commentId}"]`);
          console.log(comment)
          if (comment.length > 0) {
            // comment.item(0).scroll({behavior: 'smooth'});
            comment.item(0).scrollIntoView();
          }
        }, 1000);
    }

    checkForSharedComment(): void {
        const commentID = this.activatedRoute.snapshot.queryParamMap.get('comment');
        if (commentID) this.scrollToComment(commentID);
    }

    ngOnDestroy() {
        this._subs.unsubscribe();
    }

    @Input()
    get source(): ChatSource {
        return this._source;
    }

    set source(value) {
        this._source = value;
    }

    @Input() fixedHeight: boolean;
    @Input() maxMessages: number;
    @Input() maxVisibleMessages: number;
    @Input() genericAvatarUrl: string;

    @Input() shouldInterceptMessageSend?: (message: ChatMessage) => boolean | Promise<boolean>;

    @Input()
    get topicID(): string {
        return this._topicID;
    }

    private _topicID: string;

    set topicID(value) {
        if (this._topicID !== value) {
            this._topicID = value;
            setTimeout(() => this.setSourceFromTopicID(value));
        }
    }

    private async setSourceFromTopicID(topicID: string) {
        this._source?.close?.();
        this._source = null;
        setTimeout(async () => {
            this._source = await this.backend.getSourceForTopic(topicID, { sortOrder: this.sortOrder });

            console.log(`[banta-comments] Subscribing to source for topic '${topicID}'`);

            this._source.messageReceived.subscribe(m => this.addParticipant(m));
            this._source.messageSent.subscribe(m => this.addParticipant(m));
            this._source.messages.forEach(m => this.addParticipant(m));
        });
    }

    private addParticipant(message: ChatMessage) {
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

    user: UserAccount;

    private _newMessageText: string;

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
        return this._upvoted.asObservable();
    }

    @Output()
    get reported() {
        return this._reported.asObservable();
    }

    @Output()
    get selected() {
        return this._selected.asObservable();
    }

    @Output()
    get userSelected() {
        return this._userSelected.asObservable();
    }

    @Output()
    get usernameSelected() {
        return this._usernameSelected.asObservable();
    }

    @Output()
    get avatarSelected() {
        return this._avatarSelected.asObservable();
    }

    @Output()
    get shared() {
        return this._shared.asObservable();
    }

    onKeyDown(event: KeyboardEvent) {
    }

    insertEmoji(text: string) {
        this.newMessageText += text;
    }

    onReplyKeyDown(event: KeyboardEvent) {
    }

    insertReplyEmoji(text: string) {
        this.replyMessage += text;
    }

    sending = false;
    sendError: Error;
    expandError = false;

    indicateError(message: string) {
        this.sendError = new Error(message);
        setTimeout(() => {
            this.expandError = true;
            setTimeout(() => {
                this.expandError = false;
            }, 5 * 1000);
        });
    }

    async upvoteMessage(message: ChatMessage) {
        this._upvoted.next(message);
        await this.backend.upvoteMessage(message.topicId, message.parentMessageId ? message.parentMessageId : message.id, message.parentMessageId ? message.id : undefined);
    }

    reportMessage(message: ChatMessage) {
        this._reported.next(message);
    }

    selectedMessage: ChatMessage;
    selectedMessageThread: ChatSource;

    replyMessage: string;

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

    async selectMessage(message: ChatMessage) {
        this._selected.next(message);
        this.selectedMessage = message;
        setTimeout(() => this.selectedMessageVisible = true);
        setTimeout(async () => {
            this.selectedMessageThread = await this.backend.getSourceForThread(this.topicID, message.id);
        }, 250);
    }

    selectMessageUser(message: ChatMessage) {
        this._userSelected.next(message);
    }

    selectUsername(user: User) {
        this._usernameSelected.next(user);
    }

    selectAvatar(user: User) {
        this._avatarSelected.next(user);
    }

    shareMessage(message: ChatMessage) {
        this._shared.next(message);
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

    scrollToMessage(message: ChatMessage) {
        let el = this.elementRef.nativeElement.querySelector(`[data-comment-id="${message.id}"]`);
        if (!el)
            return;
        el.scrollIntoView({block: 'center', inline: 'start'});
    }
}
