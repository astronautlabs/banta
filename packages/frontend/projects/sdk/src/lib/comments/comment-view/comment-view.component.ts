import { Component, Input, ViewChild, ElementRef, Output, HostBinding } from "@angular/core";
import { User, ChatMessage, CommentsOrder } from '@banta/common';
import { Subject, Subscription } from 'rxjs';
import { ChatBackendBase } from "../../chat-backend-base";
import { ChatSourceBase } from "../../chat-source-base";

export interface EditEvent {
    message: ChatMessage;
    newMessage: string;
}

@Component({
    selector: 'banta-comment-view',
    templateUrl: './comment-view.component.html',
    styleUrls: ['./comment-view.component.scss']
})
export class CommentViewComponent {
    constructor(
        private backend: ChatBackendBase
    ) {

    }

    private _sourceSubs = new Subscription();
    private _source: ChatSourceBase;
    private _selected = new Subject<ChatMessage>();
    private _liked = new Subject<ChatMessage>();
    private _unliked = new Subject<ChatMessage>();
    private _reported = new Subject<ChatMessage>();
    private _userSelected = new Subject<ChatMessage>();
    private _usernameSelected = new Subject<User>();
    private _avatarSelected = new Subject<User>();
    private _shared = new Subject<ChatMessage>();
    private _messageEdited = new Subject<EditEvent>();

    @Input()
    showEmptyState = true;

    @Input()
    allowReplies = true;

    @Input()
    @HostBinding('class.fixed-height')
    fixedHeight: boolean;

    @Output()
    get selected() {
        return this._selected;
    }

    @Output() 
    get messageEdited() {
        return this._messageEdited.asObservable();
    }

    saveEdit(message: ChatMessage, newMessage: string) {
        this._messageEdited.next({ message, newMessage });
    }

    @Output()
    get userSelected() {
        return this._userSelected;
    }

    @Output()
    get reported() {
        return this._reported;
    }

    @Output()
    get liked() {
        return this._liked;
    }

    @Output()
    get unliked() {
        return this._unliked;
    }

    @Output()
    get usernameSelected() {
        return this._usernameSelected;
    }

    @Output()
    get avatarSelected() {
        return this._avatarSelected;
    }

    @Output()
    get shared() {
        return this._shared;
    }

    menuMessage: ChatMessage = null;
    messages: ChatMessage[] = [];
    currentUser: User;

    @Input()
    get source() {
        return this._source;
    }

    get editAllowed() {
        return this._source?.permissions?.canEdit;
    }

    get likeAllowed() {
        return this._source?.permissions?.canLike;
    }

    likeMessage(message: ChatMessage) {
        this._liked.next(message);
    }

    unlikeMessage(message: ChatMessage) {
        this._unliked.next(message);
    }

    reportMessage(message: ChatMessage) {
        this._reported.next(message);
    }

    selectMessage(message: ChatMessage) {
        this._selected.next(message);
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

    sharedMessage(message: ChatMessage) {
        this._shared.next(message);
    }

    startEditing(message: ChatMessage) {
        this.messages.forEach(m => m.transientState.editing = false);
        message.transientState.editing = true;
    }

    customSortEnabled = false;

    set source(value) {
        this.customSortEnabled = value?.sortOrder !== CommentsOrder.NEWEST;
        this.newMessages = [];
        this.olderMessages = [];

        if (this._sourceSubs) {
            this._sourceSubs.unsubscribe();
            this._sourceSubs = null;
        }
        this._source = value;

        if (value) {
            console.log(`[banta-comment-view] Subscribing to source...`);
            const messages = (value.messages || []).slice();
            this.messages = messages;
            this.olderMessages = messages.splice(this.maxVisibleMessages, messages.length);
            this.hasMore = !!this.source.loadAfter; //this.olderMessages.length > 0;

            this._sourceSubs = new Subscription();
            this._sourceSubs.add(this._source.messageReceived.subscribe(msg => this.messageReceived(msg)));
            this._sourceSubs.add(this._source.messageSent.subscribe(msg => this.messageSent(msg)));

            this._sourceSubs.add(
                this.backend.userChanged.subscribe(user => this.currentUser = user)
            );
        }
    }

    @Input()
    genericAvatarUrl: string;

    @ViewChild('messageContainer')
    messageContainer: ElementRef<HTMLElement>;

    @Input()
    maxMessages = 2000;

    @Input()
    maxVisibleMessages: number = 200;

    @Input()
    newestLast = false;

    isViewingMore = false;
    isLoadingMore = false;
    hasMore = false;

    newMessages: ChatMessage[] = [];
    olderMessages: ChatMessage[] = [];

    messageIdentity(index: number, chatMessage: ChatMessage) {
        return chatMessage.id;
    }

    @Output()
    sortOrderChanged = new Subject<CommentsOrder>();

    async showNew() {
        if (this.source && this.source.sortOrder !== CommentsOrder.NEWEST) {
            this.sortOrderChanged.next(CommentsOrder.NEWEST);
            return;
        }

        this.isViewingMore = false;
        this.messages = this.newMessages.splice(0, this.newMessages.length).concat(this.messages);
        let overflow = this.messages.splice(this.maxVisibleMessages, this.messages.length);
        this.olderMessages = overflow.concat(this.olderMessages);
        this.olderMessages.splice(this.maxMessages - this.maxVisibleMessages, this.olderMessages.length);
    }

    async showMore() {
        this.isViewingMore = true;

        if (this.olderMessages.length > 0) {
            this.isLoadingMore = false;
            this.messages = this.messages.concat(this.olderMessages.splice(0, 50));
        } else {
            if (this.source.loadAfter) {
                this.isLoadingMore = true;

                let lastMessage = this.messages[this.messages.length - 1];
                let messages = await this.source.loadAfter(lastMessage, 100);
                this.messages = this.messages.concat(messages);
                this.isLoadingMore = false;
                if (messages.length === 0)
                    this.hasMore = false;

            } else {
                console.warn(`Source does not have ability to present more.`);
                this.hasMore = false;
            }
        }
    }

    private addMessage(message: ChatMessage) {

        if (!message.transientState)
            message.transientState = {};
        
        let destination = this.messages;
        let bucket = this.olderMessages;

        if (this.isViewingMore) {
            destination = this.newMessages;
            bucket = null;
        }

        let newestLast = this.newestLast;

        // if (this.source.sortOrder === CommentsOrder.OLDEST)
        //     newestLast = true;
        
        if (newestLast) {
            destination.push(message);
            let overflow = destination.splice(this.maxVisibleMessages, destination.length);
            bucket?.push(...overflow);
        } else {
            destination.unshift(message);
            let overflow = destination.splice(this.maxVisibleMessages, destination.length);
            bucket?.unshift(...overflow);
        }

        if (bucket?.length > 0)
            this.hasMore = !!this.source?.loadAfter;
    }

    private messageReceived(message: ChatMessage) {
        this.addMessage(message);

        if (this.isScrolledToLatest())
            setTimeout(() => this.scrollToLatest());
    }

    isScrolledToLatest() {
        if (!this.messageContainer)
            return false;

        const el = this.messageContainer.nativeElement;
        const currentScroll = el.scrollTop;
        const currentTotal = el.scrollHeight - el.offsetHeight;

        return currentScroll > currentTotal - 10;
    }

    private messageSent(message: ChatMessage) {
        this.addMessage(message);

        if (!this.messageContainer)
            return;

        this.scrollToLatest();
    }

    scrollToLatest() {
        if (!this.messageContainer)
            return;

        const el = this.messageContainer.nativeElement;
        el.scrollTop = el.scrollHeight;
    }

    mentionsMe(message: ChatMessage) {
        if (!this.currentUser)
            return false;

        if (message.message.includes(`@${this.currentUser.username}`))
            return true;

        return false;
    }

    avatarForUser(user: User) {
        let url = this.genericAvatarUrl;

        if (user && user.avatarUrl)
            url = user.avatarUrl;

        return `url(${url})`;
    }
}
