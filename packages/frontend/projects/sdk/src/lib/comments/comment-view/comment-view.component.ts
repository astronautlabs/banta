import {Component, Input, ViewChild, ElementRef, Output, HostBinding} from "@angular/core";
import {User, ChatMessage, ChatSource} from '@banta/common';
import {SubSink} from 'subsink';
import {Subject} from 'rxjs';
import {ChatBackendService} from "../../common";

@Component({
    selector: 'banta-comment-view',
    templateUrl: './comment-view.component.html',
    styleUrls: ['./comment-view.component.scss']
})
export class CommentViewComponent {
    constructor(
        private backend: ChatBackendService
    ) {

    }

    private _sourceSubs = new SubSink();
    private _source: ChatSource;
    private _selected = new Subject<ChatMessage>();
    private _upvoted = new Subject<ChatMessage>();
    private _reported = new Subject<ChatMessage>();
    private _userSelected = new Subject<ChatMessage>();
    private _usernameSelected = new Subject<User>();
    private _avatarSelected = new Subject<User>();
    private _shared = new Subject<ChatMessage>();

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
    get userSelected() {
        return this._userSelected;
    }

    @Output()
    get reported() {
        return this._reported;
    }

    @Output()
    get upvoted() {
        return this._upvoted;
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

    upvoteMessage(message: ChatMessage) {
        this._upvoted.next(message);
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

    set source(value) {
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
            this.hasMore = this.olderMessages.length > 0;

            this._sourceSubs = new SubSink();
            this._sourceSubs.add(
                this._source.messageReceived
                    .subscribe(msg => this.messageReceived(msg)),
                this._source.messageSent
                    .subscribe(msg => this.messageSent(msg))
            );


            if (this._source.currentUserChanged) {
                this._sourceSubs.add(
                    this._source.currentUserChanged.subscribe(user => this.currentUser = user)
                );
            }
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

    async showNew() {
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
                this.hasMore = false;
            }
        }
    }

    private addMessage(message: ChatMessage) {
        let destination = this.messages;
        let bucket = this.olderMessages;

        if (this.isViewingMore) {
            destination = this.newMessages;
            bucket = null;
        }

        if (this.newestLast) {
            destination.push(message);
            let overflow = destination.splice(this.maxVisibleMessages, destination.length);
            bucket?.push(...overflow);
        } else {
            destination.unshift(message);
            let overflow = destination.splice(this.maxVisibleMessages, destination.length);
            bucket?.unshift(...overflow);
        }

        if (bucket?.length > 0)
            this.hasMore = true;
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
