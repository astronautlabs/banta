/// <reference types="@types/resize-observer-browser" />

import { Component, ContentChild, ElementRef, HostBinding, Input, NgZone, Output, QueryList, TemplateRef, ViewChild, ViewChildren } from '@angular/core';
import { User, ChatMessage, CommentsOrder } from '@banta/common';
import { HashTag } from '../comment-field/comment-field.component';
import { Subject, Observable, Subscription } from 'rxjs';
import { take } from 'rxjs/operators';

import { ActivatedRoute } from '@angular/router';
import { ChatBackendBase } from '../../chat-backend-base';
import { ChatSourceBase } from '../../chat-source-base';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BantaReplySendOptionsDirective } from '../reply-send-options.directive';
import { MessageMenuItem } from '../../message-menu-item';
import { CommentViewComponent } from '../comment-view/comment-view.component';
import { CommentComponent } from '../comment/comment.component';

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
        private backend: ChatBackendBase,
        private elementRef: ElementRef<HTMLElement>,
        private activatedRoute: ActivatedRoute,
        private matSnackBar: MatSnackBar,
        private ngZone: NgZone
    ) {
        this.sendMessage = async (message: ChatMessage) => {
            try {
                const intercept = await this.shouldInterceptMessageSend?.(message, this.source);
                if (!intercept) {
                    await this.source.send(message);
                }

                if (this.source.sortOrder !== CommentsOrder.NEWEST) {
                    this.sortOrder = CommentsOrder.NEWEST;
                }
                return true;
            } catch (e) {
                this.handleBackendException(e, 'Could not send: ');
            }
        }

        this.sendReply = async (message: ChatMessage) => {
            try {
                const intercept = await this.shouldInterceptMessageSend?.(message, this.selectedMessageThread);
                if (!intercept) {
                    await this.selectedMessageThread.send(message);
                }
                return true;
            } catch (e) {
                this.handleBackendException(e, 'Could not send reply: ');
            }
        }
    }

    get element() {
        return this.elementRef.nativeElement;
    }

    private handleBackendExceptionAsAlert(e: Error, prefix: string = '') {
        try {
            this.handleBackendException(e, prefix);
        } catch (e) {
            alert(e.message);
        }
    }

    private handleBackendException(e: Error, prefix: string = '') {
        let errorMessage = e.message;

        if (errorMessage.startsWith('permission-denied|')) {
            errorMessage = errorMessage.replace(/^permission-denied\|/, '');

            if (errorMessage.startsWith(`app-handle|`)) {
                // If this is an error during authorizeAction on the backend, pass control to the user-provided 
                // permission-denied handler.

                this.sendPermissionDenied(errorMessage.replace(/^app-handle\|/, ''));
                return;
            }
        }

        throw new Error(`${prefix}${errorMessage}`);
    }

    // Lifecycle Events / Initialization

    ngOnInit() {
        this._subs.add(this.backend.userChanged.subscribe(user => this.user = user));
        this.startLoading();

        if (typeof window !== 'undefined') {
            let queryString = window.location.search.substring(1);
            let query = queryString.split('&')
                .map(s => s.split('='))
                .reduce((o, [k, v]) => (o[decodeURIComponent(k)] = decodeURIComponent(v), o), {})
            ;

            const commentID = query['comment'];
            if (commentID) {
                this.sharedCommentID = commentID;
            }
        }
    }

    private resizeObserver: ResizeObserver;
    private width: number;
    private height: number;

    @HostBinding('class.banta-mobile')
    isMobileSized: boolean = false;

    @ContentChild(BantaReplySendOptionsDirective, {read: TemplateRef}) 
    sendReplyOptionsTemplate: any;

    markViewReady: () => void;
    viewReady = new Promise<void>(r => this.markViewReady = r);

    ngAfterViewInit() {
        if (typeof window !== 'undefined') {
            let callback = () => {
                let size = this.elementRef.nativeElement.getBoundingClientRect();
                this.ngZone.run(() => {
                    setTimeout(() => {
                        this.width = size.width;
                        this.height = size.height;
                        this.isMobileSized = this.width < 500;
                    });
                })
            };

            if (typeof ResizeObserver !== 'undefined') {
                this.resizeObserver = new ResizeObserver(callback);
                this.resizeObserver.observe(this.elementRef.nativeElement);
            } else {
                // One check is better than nothing!
                setTimeout(() => {
                    this.width = this.elementRef.nativeElement.clientWidth;
                    this.height = this.elementRef.nativeElement.clientHeight;
                    this.isMobileSized = this.width < 500;
                }, 1000);
            }

            callback();
        }

        this.markViewReady();
    }

    ngOnDestroy() {
        this._subs.unsubscribe();
        if (this.resizeObserver)
            this.resizeObserver.disconnect();
    }

    private async setSourceFromTopicID(topicID: string) {
        if (typeof window === 'undefined')
            return;

        setTimeout(async () => {
            console.log(`[banta-comments] Subscribing to topic source '${topicID}'`);
            this.source = await this.backend.getSourceForTopic(topicID, { sortOrder: this.sortOrder });
            this._sourceIsOwned = true;
        });
    }

    // Loading Screen
    private _loadingMessage = '';
    loadingMessageVisible = false;

    get loadingMessage() {
        return this._loadingMessage;
    }

    set loadingMessage(value) {
        this.loadingMessageVisible = false;
        setTimeout(() => {
            this._loadingMessage = value;
            this._loadingMessage = value;
            setTimeout(() => {
                this.loadingMessageVisible = true;
            })
        }, 500);
    }

    loading: boolean = true;
    showLoadingScreen = false;
    loadingStartedAt: number;
    messageChangedAt: number;
    sharedCommentID: string;
    lastSharedCommentID: string;

    @Input() customMenuItems: MessageMenuItem[] = [];

    private async startLoading() {
        this.loadingStartedAt = this.messageChangedAt = Date.now();

        if (this.updateLoading()) return;
        await new Promise<void>(resolve => setTimeout(() => resolve(), 100));
        if (this.updateLoading()) return;
        await new Promise<void>(resolve => setTimeout(() => resolve(), 250));
        if (this.updateLoading()) return;
        await new Promise<void>(resolve => setTimeout(() => resolve(), 500));
        if (this.updateLoading()) return;

        console.log(`[Banta] Loading is taking a long time! Showing loading screen.`);
        this.showLoadingScreen = true;
        if (typeof window !== 'undefined')
            this._loadingTimer = setInterval(() => this.updateLoading(), 1000);
    }
    
    private _loadingTimer;
    private _loadingMessageIndex = 0;

    @Input() maxCommentLength: number = 1500;
    @Input() loadingMessages: string[] = [
        `Just a second...`,
        `We're definitely working on it.`,
        `There's no need to refresh.`,
        `It's definitely worth the wait!`,
        `This has never happened before.`,
        `We'll keep trying, but it's not looking great. 
            Commenting & chat services may be down. 
            If you continue to experience issues, please contact support.
        `
    ];

    @Input() useInlineReplies = true;

    /**
     * Access the CommentViewComponent for this BantaCommentsComponent. 
     * CommentViewComponent is responsible for interacting with the ChatSource 
     * object and rendering comments as CommentComponents. It is the source of 
     * truth for which CommentComponent corresponds to which ChatMessage. 
     * 
     * Note that this CommentViewComponent is only for the top level comments.
     * Replies are handled by a separate CommentViewComponent which can be 
     * retrieved using the threadView property.
     */
    @ViewChild('commentView')
    commentView: CommentViewComponent;

    @ViewChildren(CommentViewComponent)
    threadViewQuery: QueryList<CommentViewComponent>;

    /**
     * Attempts to find the CommentComponent that corresponds to the given ChatMessage.
     * The ChatMessage could be a top-level message in this conversation, or a reply, 
     * but note that a CommentComponent will only exist for a reply if the user has 
     * the relevant reply thread open.
     * @param message The message to look for
     */
    getCommentComponentForMessage(message: ChatMessage): CommentComponent {
        if (message.parentMessageId)
            return this.threadView?.getCommentComponentForMessage(message);
        else
            return this.commentView.getCommentComponentForMessage(message)
    }

    /**
     * Access the CommentViewComponent corresponding to the currently open reply thread.
     * This is not the top level comments, but instead the reply thread that the user has 
     * opened (only one set of replies can be open at a time).
     * 
     * For details about what CommentViewComponent affords you, see the commentView property.
     */
    get threadView() {
        return Array.from(this.threadViewQuery).filter(x => x !== this.commentView)[0];
    }

    async waitForThreadView() {
        if (this.threadView)
            return this.threadView;
        
        await this.threadViewQuery.changes.pipe(take(1)).toPromise();
        return this.threadView;
    }

    markLoaded: () => void;
    loaded = new Promise<void>(r => this.markLoaded = r);

    private updateLoading(): boolean {
        if (this.source?.state && this.source?.state !== 'connecting') {
            clearInterval(this._loadingTimer);
            this.loadingMessage = `Here we go!`;
            setTimeout(() => {
                this.loading = false;
                this.markLoaded();
            }, 750);
            return true;
        }

        let messageSwitchTime = 5*1000;
        if (this.messageChangedAt + messageSwitchTime < Date.now()) {
            if (this.loadingMessages[this._loadingMessageIndex]) {
                this.loadingMessage = this.loadingMessages[this._loadingMessageIndex++];
                this.messageChangedAt = Date.now();
            }
        }

        return false;
    }

    // Properties

    private _signInSelected = new Subject<void>();
    private _permissionDeniedError = new Subject<string>();
    private _editAvatarSelected = new Subject<void>();
    private _upvoted = new Subject<ChatMessage>();
    private _reported = new Subject<ChatMessage>();
    private _selected = new Subject<ChatMessage>();
    private _userSelected = new Subject<ChatMessage>();
    private _shared = new Subject<ChatMessage>();
    private _usernameSelected = new Subject<User>();
    private _avatarSelected = new Subject<User>();
    private _source: ChatSourceBase;

    /**
     * Track whether we created this source. If we did not (ie it was passed in from the caller),
     * then we are not responsible for calling close(). If we do own it though, we will call close() 
     * when we are done with it.
     */
    private _sourceIsOwned = false;
    private _subs = new Subscription();
    private _sortOrder: CommentsOrder = CommentsOrder.NEWEST;
    private _topicID: string;
    
    user: User;
    selectedMessage: ChatMessage;
    selectedMessageThread: ChatSourceBase;
    selectedMessageVisible = false;

    // Inputs

    @Input() signInLabel = 'Sign In';
    @Input() sendLabel = 'Send';
    @Input() replyLabel = 'Reply';
    @Input() sendingLabel = 'Sending';
    @Input() permissionDeniedLabel = 'Send';
    @Input() postCommentLabel = 'Post a comment';
    @Input() postReplyLabel = 'Post a reply';
    @Input() allowAttachments = true;
    @Input() fixedHeight: boolean;
    @Input() maxMessages: number;
    @Input() maxVisibleMessages: number;
    @Input() genericAvatarUrl = `https://gravatar.com/avatar/${Date.now().toString(16)}?s=512&d=robohash`;

    @Input() shouldInterceptMessageSend?: (message: ChatMessage, source: ChatSourceBase) => boolean | Promise<boolean>;
    @Input() participants: User[] = [];

    private _sourceSubscription: Subscription;

    @Input()
    get source(): ChatSourceBase { return this._source; }
    set source(value) { 
        if (this._source && this._sourceIsOwned) {
            this._source.close();
            this._sourceSubscription?.unsubscribe();
            this._source = null;
            this.participants = [];
        }

        this._source = value;
        this._sourceIsOwned = false; // Assume we don't own this source.
        this._sourceSubscription = new Subscription();
        
        if (value) {
            if (this.sharedCommentID) {
                this.navigateToSharedComment(this.sharedCommentID);
                this.lastSharedCommentID = this.sharedCommentID;
                this.sharedCommentID = null;
            }

            this._source.messages.forEach(m => this.addParticipant(m));

            this._sourceSubscription.add(this._source.messageReceived.subscribe(m => this.addParticipant(m)));
            this._sourceSubscription.add(this._source.messageSent.subscribe(m => this.addParticipant(m)));
            this._sourceSubscription.add(this._source.messageObserved.subscribe(m => this.addParticipant(m)));
            this._sourceSubscription.add(
                this._source.messageUpdated.subscribe(msg => {
                    console.log(`comments received message: `, msg);
                    if (msg.id === this.selectedMessage?.id && msg.hidden) {
                        this.unselectMessage();
                        this.matSnackBar.open(
                            "The thread you were viewing was removed.",
                            undefined,
                            {
                                duration: 2500
                            }
                        )
                    }
                })
            );

        }
    }
    @Input() 
    hashtags: HashTag[] = [
        {hashtag: 'error', description: 'Cause an error'},
        {hashtag: 'timeout', description: 'Cause a slow timeout error'},
        {hashtag: 'slow', description: 'Be slow when this message is posted'},
    ];
    @Input()
    get topicID(): string { return this._topicID; }
    set topicID(value) {
        if (this._topicID !== value) {
            this._topicID = value;
            setTimeout(() => this.setSourceFromTopicID(value));
        }
    }

    // Outputs

    @Output() get signInSelected(): Observable<void> { return this._signInSelected; }
    @Output() get editAvatarSelected() { return this._editAvatarSelected; }
    @Output() get permissionDeniedError(): Observable<string> { return this._permissionDeniedError; }
    @Output() get upvoted() { return this._upvoted.asObservable(); }
    @Output() get reported() { return this._reported.asObservable(); }
    @Output() get selected() { return this._selected.asObservable(); }
    @Output() get userSelected() { return this._userSelected.asObservable(); }
    @Output() get usernameSelected() { return this._usernameSelected.asObservable(); }
    @Output() get avatarSelected() { return this._avatarSelected.asObservable(); }
    @Output() get shared() { return this._shared.asObservable(); }

    get sortOrder() { return this._sortOrder; }
    set sortOrder(value) {
        if (this._sortOrder !== value) {
            this._sortOrder = value;
            setTimeout(() => {
                this.setSourceFromTopicID(this.topicID);
            });
        }
    }

    sendMessage: (message: ChatMessage) => void;
    sendReply: (message: ChatMessage) => void;

    // UI Interactions

    async scrollToComment(commentId: ChatMessage['id']) {
        if (typeof window === 'undefined')
            return;
        
        await this.commentView.waitForAllCommentsToLoad();

        const comment = document.querySelector(`[data-comment-id="${commentId}"]`);
        if (comment) {
            comment.scrollIntoView({
                inline: 'center',
                block: 'center'
            });
        }
    }

    loadingSharedComment = false;
    sharedCommentMissing = false;

    async navigateToSharedComment(id: string) {
        this.loadingSharedComment = true;
        await new Promise(r => setTimeout(r, 10));
        this.sharedCommentMissing = false;
        let source = this.source;

        await source.ready;
        await this.viewReady;
        await this.loaded;
        
        console.log(`Navigating to shared comment with ID '${id}'...`);
        let message: ChatMessage;
        
        try {
            message = await this.source.get(id);
        } catch (e) {
            console.error(`Failed to find comment from URL: ${e.message}`);
            this.sharedCommentMissing = true;
            this.loadingSharedComment = false;

            if (typeof window !== 'undefined') {
                setTimeout(() => {
                    let notice = this.element.querySelector('.loading-comment');
                    notice.scrollIntoView({
                        block: 'center',
                        inline: 'center'
                    });
                }, 200);
            }
            return;
        }

        message.transientState ??= {};

        // If there is a parent message, we should instead focus that and let the 
        // scrollToComment and highlight do the work.

        if (message.parentMessageId) {

            let parentMessage = await this.source.get(message.parentMessageId);
            parentMessage.transientState ??= {};
            
            // Make sure that this message is loaded and visible to the user
            await this.commentView.loadMessageInContext(parentMessage);
            
            let thread = await this.selectMessage(parentMessage); 

            // Need to re-retrieve the message within the new chat source to affect its
            // transient state.
            await thread.ready;
            
            // Make sure that this message is loaded and visible to the user
            await this.waitForThreadView();
            await this.threadView.loadMessageInContext(message);

            message = await thread.get(message.id);
            message.transientState ??= {};
            message.transientState.highlighted = true;
            console.dir(message);
            await new Promise<void>(resolve => setTimeout(() => resolve(), 500));

        } else {
            // Make sure that this message is loaded and visible to the user
            await this.commentView.loadMessageInContext(message);

            message.transientState ??= {};
            message.transientState.highlighted = true;
        }

        this.loadingSharedComment = false;
        await this.scrollToComment(id);
    }

    handlePermissionDenied(errorMessage: string) {
        // This is what other components call when handling permission errors
        
        if (errorMessage.startsWith(`app-handle|`)) {
            // If this is an error during authorizeAction on the backend, pass control to the user-provided 
            // permission-denied handler.

            this.sendPermissionDenied(errorMessage.replace(/^app-handle\|/, ''));
            return;
        }

        alert(errorMessage);
    }

    sendPermissionDenied(message: string) {
        this._permissionDeniedError.next(message);
    }

    scrollToMessage(message: ChatMessage) {
        let el = this.elementRef.nativeElement.querySelector(`[data-comment-id="${message.id}"]`);
        if (!el)
            return;
        el.scrollIntoView({block: 'center', inline: 'start'});
    }

    private addParticipant(message: ChatMessage) {
        if (!message || !message.user || !message.user.id)
            return;

        let existing = this.participants.find(x => x.id === message.user.id);
        if (existing)
            return;
        this.participants.push(message.user);
    }

    // Actions

    async likeMessage(source: ChatSourceBase, message: ChatMessage) {
        if (!this.user) {
            await this.showSignIn();
            return;
        }

        this._upvoted.next(message);
        message.transientState.liking = true;
        
        try {
            await source.likeMessage(message.id);
        } catch (e) {
            this.handleBackendExceptionAsAlert(e, 'Could not like this message: ');
        } finally {
            await new Promise<void>(resolve => setTimeout(() => resolve(), 250));
            message.transientState.liking = false;
        }
    }

    async unlikeMessage(source: ChatSourceBase, message: ChatMessage) {
        if (!this.user) {
            await this.showSignIn();
            return;
        }

        this._upvoted.next(message);
        message.transientState.liking = true;

        if (message.userState?.liked)
            message.likes = (message.likes || 0) - 1;

        try {
            await source.unlikeMessage(message.id);
        } catch (e) {
            this.handleBackendExceptionAsAlert(e, 'Failed to unlike this message: ');
        }

        await new Promise<void>(resolve => setTimeout(() => resolve(), 250));
        message.transientState.liking = false;
    }

    async reportMessage(message: ChatMessage) {
        this._reported.next(message);
    }

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

    async toggleSelectedMessage(message: ChatMessage) {
        if (this.selectedMessage === message) {
            await this.unselectMessage();
        } else {
            await this.selectMessage(message);
        }
    }

    async selectMessage(message: ChatMessage) {
        if (this.selectedMessage === message) {
            console.log(`[Banta] Thread ${this.topicID}/${message.id} is already open.`);
            return this.selectedMessageThread;
        }

        this._selected.next(message);

        console.log(`[Banta] Opening thread for ${this.topicID}/${message.id}...`);
        let selectedMessageThread = await this.backend.getSourceForThread(this.topicID, message.id);

        if (!selectedMessageThread) {
            console.warn(`Failed to locate thread for message ${this.topicID}/${message.id}!`);
            return null;
        }

        console.log(`[Banta] Thread opened for ${this.topicID}/${message.id}.`);

        setTimeout(() => this.selectedMessageVisible = true);
        setTimeout(async () => {
            this.selectedMessage = message;
            this.selectedMessageThread = selectedMessageThread;
        }, 250);

        return selectedMessageThread;
    }

    async showSignIn() {
        this._signInSelected.next();
    }

    async showEditAvatar() {
        this._editAvatarSelected.next();
    }

    async selectMessageUser(message: ChatMessage) {
        this._userSelected.next(message);
    }

    async selectUsername(user: User) {
        this._usernameSelected.next(user);
    }

    async selectAvatar(user: User) {
        this._avatarSelected.next(user);
    }

    async shareMessage(message: ChatMessage) {
        this._shared.next(message);
    }

    async deleteMessage(message: ChatMessage) {
        if (!this.user) {
            await this.showSignIn();
            return;
        }

        if (!confirm("Are you sure you want to delete this comment? You cannot undo this action."))
            return;

        try {
            await this.source.deleteMessage(message.id);

            if (this.selectedMessage?.id === message.id)
                this.unselectMessage();

        } catch (e) {
            this.handleBackendExceptionAsAlert(e, `Could not delete message: `);
        }
    }

    async editMessage(source: ChatSourceBase, message: ChatMessage, newText: string) {
        if (!this.user) {
            await this.showSignIn();
            return;
        }

        try {
            await source.editMessage(message.id, newText);
        } catch (e) {
            this.handleBackendExceptionAsAlert(e, 'Could not edit this message: ');
            return;
        }

        message.message = newText;
        message.transientState.editing = false;
    }

    async startEditing(message: ChatMessage) {
        this.selectedMessage.transientState.editing = false;
        message.transientState.editing = true;
    }

    async saveEdit(message: ChatMessage, text: string) {
        if (!this.user) {
            await this.showSignIn();
            return;
        }
        
        try {
            await this.source.editMessage(message.id, text);
            message.transientState.editing = false;
        } catch (e) {
            this.handleBackendExceptionAsAlert(e, `Could not edit message: `);
        }
    }
}
