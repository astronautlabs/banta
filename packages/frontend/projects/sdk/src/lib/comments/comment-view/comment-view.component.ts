import { Component, Input, ViewChild, ElementRef, Output, HostBinding, ViewChildren, QueryList } from "@angular/core";
import { User, ChatMessage, CommentsOrder, FilterMode } from '@banta/common';
import { Subject, Subscription } from 'rxjs';
import { ChatBackendBase } from "../../chat-backend-base";
import { ChatSourceBase } from "../../chat-source-base";
import { MessageMenuItem } from "../../message-menu-item";
import { CommentComponent } from "../comment/comment.component";

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
        private backend: ChatBackendBase,
        private elementRef: ElementRef<HTMLElement>
    ) {
    }

    //#region Source

    private _source: ChatSourceBase;
    @Input() get source() { return this._source; }
    set source(value) { this.setSource(value); }

    //#endregion
    //#region Fields

    private _sourceSubs = new Subscription();
    menuMessage: ChatMessage = null;
    messages: ChatMessage[] = [];
    currentUser: User;
    customSortEnabled = false;
    markSourceLoaded: () => void;
    sourceLoaded = new Promise<void>(r => this.markSourceLoaded = r);
    isViewingMore = false;
    isLoadingMore = false;
    hasMore = false;
    newMessages: ChatMessage[] = [];
    olderMessages: ChatMessage[] = [];

    //#endregion
    //#region Inputs

    @Input() maxMessages = 2000;
    @Input() maxVisibleMessages: number = 200;
    @Input() newestLast = false;
    @Input() holdNewMessages = false;
    @Input() showEmptyState = true;
    @Input() allowReplies = true;
    @Input() enableHoldOnClick = false;
    @Input() enableHoldOnScroll = true;
    @Input() customMenuItems: MessageMenuItem[] = [];
    @Input() @HostBinding('class.fixed-height') fixedHeight: boolean;
    @Input() selectedMessage: ChatMessage;
    @Input() genericAvatarUrl: string;
    
    //#endregion
    //#region Outputs

    private _selected = new Subject<ChatMessage>();
    private _liked = new Subject<ChatMessage>();
    private _unliked = new Subject<ChatMessage>();
    private _reported = new Subject<ChatMessage>();
    private _userSelected = new Subject<ChatMessage>();
    private _usernameSelected = new Subject<User>();
    private _avatarSelected = new Subject<User>();
    private _shared = new Subject<ChatMessage>();
    private _deleted = new Subject<ChatMessage>();
    private _messageEdited = new Subject<EditEvent>();
    private _sortOrderChanged = new Subject<CommentsOrder>();
    private _filterModeChanged = new Subject<FilterMode>();

    @Output() readonly userSelected = this._userSelected.asObservable();
    @Output() readonly reported = this._reported.asObservable();
    @Output() readonly liked = this._liked.asObservable();
    @Output() readonly unliked = this._unliked.asObservable();
    @Output() readonly usernameSelected = this._usernameSelected.asObservable();
    @Output() readonly avatarSelected = this._avatarSelected.asObservable();
    @Output() readonly shared = this._shared.asObservable();
    @Output() readonly deleted = this._deleted.asObservable();
    @Output() readonly selected = this._selected.asObservable();
    @Output() readonly messageEdited = this._messageEdited.asObservable();
    @Output() readonly sortOrderChanged = this._sortOrderChanged.asObservable();
    @Output() readonly filterModeChanged = this._filterModeChanged.asObservable();

    //#endregion 
    //#region UI Bindings

    @ViewChildren(CommentComponent) commentsQuery: QueryList<CommentComponent>;
    @ViewChild('messageContainer') messageContainer: ElementRef<HTMLElement>;
    get comments() { return Array.from(this.commentsQuery); }

    //#endregion

    /**
     * Returns true if this message can be found within one of the message buffers (older, current, newer)
     * @param message 
     */
    isMessageLoadedInContext(message: ChatMessage) {
        return this.olderMessages.find(x => x.id === message.id)
            || this.messages.find(x => x.id === message.id)
            || this.newMessages.find(x => x.id === message.id);
    }

    async loadMessageInContext(message: ChatMessage) {
        await this.sourceLoaded;
        
        console.log(`Loading message ${message.id} in context...`);
        while (this.hasMore && !this.isMessageLoadedInContext(message)) {
            console.log(`...Need to load more comments to find ${message.id}`);
            await this.showMore();
        }

        if (!this.isMessageLoadedInContext(message)) {
            console.error(`Error while loading message in context: Failed to find message ${message.id}, maybe it was deleted!`);
            return false;
        }

        let pageSize = this.maxVisibleMessages;
        let items = [].concat(this.olderMessages, this.messages, this.newMessages);
        let index = items.findIndex(x => x.id === message.id);

        if (index < 0) {
            console.error(`Error while loading message in context: Message was not present in message list!`);
            return false;
        }

        let startIndex = Math.max(0, index - pageSize / 2);        
        this.newMessages = items.splice(0, startIndex);
        this.messages = items.splice(0, pageSize);
        this.olderMessages = items;
        this.isViewingMore = true;
    }

    get shouldShowNewMessageIndicator() {
        return this.isViewingMore 
            || this.customSortEnabled 
            || this.source.filterMode !== FilterMode.ALL
            || this.newMessages.length > 0;
    }

    get shouldHoldNewMessages() {
        if (this.holdNewMessages || this.isViewingMore) {
            console.log(`holding due to settings`);
            return true;
        }

        if (this.enableHoldOnScroll) {
            let keyMessage: ChatMessage;

            if (this.newestLast)
                keyMessage = this.messages[this.messages.length - 1];
            else
                keyMessage = this.messages[0];
            
            if (keyMessage) {
                const messageElement = this.getElementForComment(keyMessage.id);
                if (messageElement) {
                    if (!this.isElementVisible(messageElement)) {
                        console.log(`key element is not visible`);
                        return true;
                    } else {
                        console.log(`key element is visible`);
                    }
                } else {
                    console.log(`could not find key element`);
                }
            } else {
                console.log(`could not find key message`);
            }

            return false;
        }

        return false;
    }

    private isElementVisible(element: Element) {
        const elementRect = element.getBoundingClientRect();
        return !!elementRect 
            && elementRect.bottom >= 0
            && elementRect.right >= 0
            && elementRect.left <= document.documentElement.clientWidth
            && elementRect.top <= document.documentElement.clientHeight;
    }

    /**
     * Get the CommentComponent instantiated for the given ChatMessage,
     * if it exists in the current view. Note that messages which are not 
     * currently shown to the user will not return a CommentComponent.
     * @param message 
     * @returns 
     */
    getCommentComponentForMessage(message: ChatMessage) {
        if (!message)
            throw new Error(`You must pass a valid ChatMessage`);
        return this.comments.find(x => x.message?.id === message.id);
    }

    saveEdit(message: ChatMessage, newMessage: string) {
        this._messageEdited.next({ message, newMessage });
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

    deleteMessage(message: ChatMessage) {
        this._deleted.next(message);
    }

    private setSource(value: ChatSourceBase) {
        this.customSortEnabled = value?.sortOrder !== CommentsOrder.NEWEST;
        this.newMessages = [];
        this.olderMessages = [];

        (window as any).bantaSourceDebug = value;

        if (this._sourceSubs) {
            this._sourceSubs.unsubscribe();
            this._sourceSubs = null;
        }
        this._source = value;

        if (value) {
            const messages = (value.messages || []).slice();
            this.messages = messages;
            this.olderMessages = messages.splice(this.maxVisibleMessages, messages.length);
            this.hasMore = true; //this.olderMessages.length > 0;

            this._sourceSubs = new Subscription();
            this._sourceSubs.add(this._source.messageReceived.subscribe(msg => this.messageReceived(msg)));
            this._sourceSubs.add(this._source.messageSent.subscribe(msg => this.messageSent(msg)));

            this._sourceSubs.add(
                this.backend.userChanged.subscribe(user => this.currentUser = user)
            );

            this.getInitialMessages();
        }
    }

    private async getInitialMessages() {
        let messages = (await this._source.getExistingMessages());
        messages.forEach(m => m.transientState ??= {});
        this.messages = this.newestLast ? messages.slice().reverse() : messages;
        this.sortMessages();
        if (this.markSourceLoaded)
            this.markSourceLoaded();
    }

    messageIdentity(index: number, chatMessage: ChatMessage) {
        return chatMessage.id;
    }

    async showNew(event: MouseEvent) {
        let naturalOrder = CommentsOrder.NEWEST;
        if (this.source && (this.source.sortOrder !== naturalOrder || this.source.filterMode !== FilterMode.ALL)) {
            if (this.source.sortOrder !== naturalOrder)
                this._sortOrderChanged.next(naturalOrder);
            if (this.source.filterMode !== FilterMode.ALL)
                this._filterModeChanged.next(FilterMode.ALL);
            return;
        }

        this.isViewingMore = false;

        if (this.newestLast)
            this.messages = this.messages.concat(this.newMessages.splice(0, this.newMessages.length));
        else
            this.messages = this.newMessages.splice(0, this.newMessages.length).concat(this.messages);
        let overflow = this.messages.splice(this.maxVisibleMessages, this.messages.length);
        this.olderMessages = overflow.concat(this.olderMessages);
        this.olderMessages.splice(this.maxMessages - this.maxVisibleMessages, this.olderMessages.length);
        this.hasMore = this.olderMessages.length > 0;

        if (this.messages.length > 0) {
            if (this.newestLast) {
                this.scrollToComment(this.messages[this.messages.length - 1].id);
            } else {
                this.scrollToComment(this.messages[0].id);
            }
        }
    }

    async showMore() {
        this.isViewingMore = true;

        if (this.olderMessages.length > 0) {
            this.isLoadingMore = false;
            this.messages = this.messages.concat(this.olderMessages.splice(0, 50));
        }
        this.isLoadingMore = true;

        let nextPageSize = 20;
        let lastMessage: ChatMessage;

        if (this.newestLast) {
            lastMessage = this.olderMessages[0] ?? this.messages[0];
        } else {
            lastMessage = this.olderMessages[this.olderMessages.length - 1] ?? this.messages[this.messages.length - 1];
        }

        if (!lastMessage) {
            this.isLoadingMore = false;
            this.hasMore = false;
            return;
        }

        let messages = await this.source.loadAfter(lastMessage, nextPageSize);

        if (this.newestLast)
            messages = messages.slice().reverse();
        
        messages.forEach(m => m.transientState ??= {});

        if (this.newestLast)
            this.messages = messages.concat(this.messages);
        else
            this.messages = this.messages.concat(messages);
        this.isLoadingMore = false;
        if (messages.length === 0) {
            console.log(`Reached the end of the list.`);
            this.hasMore = false;
        }
    }

    private addMessage(message: ChatMessage) {

        if (!message.transientState)
            message.transientState ??= {};
        
        let destination = this.messages;
        let bucket = this.olderMessages;
        let newestLast = this.newestLast;

        if (this.shouldHoldNewMessages) {
            destination = this.newMessages;
            bucket = null;
        }

        
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
            this.hasMore = true;

        message.pagingCursor = String(this.incrementPagingCursors());
        this.sortMessages();
    }

    private incrementPagingCursors() {
        if (this.source.sortOrder !== CommentsOrder.NEWEST)
            return;
        
        let maxPagingCursor = 0;
        for (let group of [this.messages, this.olderMessages, this.newMessages]) {
            for (let message of group) {
                if (message.pagingCursor) {
                    let pagingCursor = Number(message.pagingCursor) + 1;
                    if (pagingCursor > maxPagingCursor)
                        maxPagingCursor = pagingCursor;
                    message.pagingCursor = String(pagingCursor);
                }
            }
        }

        return maxPagingCursor;
    }

    /**
     * Wait for all currently visible comments to be fully loaded, including all attachments.
     * Doing this will prevent layout shift when scrolling to a specific comment.
     */
    async waitForAllCommentsToLoad() {
        await new Promise(r => setTimeout(r, 100));
        await this.sourceLoaded;
        await Promise.all(this.comments.map(x => x.waitForLoad()));
    }

    private sortMessages() {
        if (!this.source)
            return;
        
        let sorter: (a: ChatMessage, b: ChatMessage) => number;

        if (this.source.sortOrder === CommentsOrder.LIKES)
            sorter = (a, b) => b.likes - a.likes;
        else if (this.source.sortOrder === CommentsOrder.NEWEST)
            sorter = (a, b) => (b.sentAt - a.sentAt) * (this.newestLast ? -1 : 1);
        else if (this.source.sortOrder === CommentsOrder.OLDEST)
            sorter = (a, b) => (a.sentAt - b.sentAt) * (this.newestLast ? -1 : 1);

        this.messages.sort(sorter);
        this.olderMessages.sort(sorter);
        this.newMessages.sort(sorter);
    }

    private messageReceived(message: ChatMessage) {
        this.addMessage(message);
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
        if (!this.messageContainer) {
            return;
        }

        const el = this.messageContainer.nativeElement;

        el.scrollIntoView({ block: 'start' });
        //el.scrollTop = el.scrollHeight;
    }

    get element() {
        return this.elementRef.nativeElement;
    }

    async scrollToComment(commentId: ChatMessage['id']) {
        if (typeof window === 'undefined')
            return;
        
        await this.waitForAllCommentsToLoad();

        const comment = this.getElementForComment(commentId);
        if (comment) {
            comment.scrollIntoView({
                inline: 'center',
                block: 'center'
            });
        }
    }

    getElementForComment(commentId: string) {
        return this.element.querySelector(`[data-comment-id="${commentId}"]`);
    }

    mentionsMe(message: ChatMessage) {
        if (!this.currentUser)
            return false;

        if (message.message.includes(`@${this.currentUser.username}`))
            return true;

        return false;
    }
}
