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
    messageClicked = false;

    get previousMessages() { return this.newestLast ? this.olderMessages : this.newMessages; }
    get nextMessages() { return this.newestLast ? this.newMessages : this.olderMessages; }

    /**
     * While this is called "new" messages, it really represents the messages that would be visible *at the beginning 
     * of the sort order*, which can be flipped by the newestLast feature (used for replies mode). 
     * 
     * So, when newestLast is false, regardless of the current sortOrder, newMessages are conceptually 
     * *above* the visible set of messages.
     * 
     * When newestLast is true (as in replies mode), regardless of the current sortOrder, newMessages are conceptually 
     * *below* the visible set of messages.
     */
    newMessages: ChatMessage[] = [];

    /**
     * While this is called "older" messages, it really represents the messages that would be visible *at the end of the 
     * sort order*, which can be flipped by the newestLast feature (useds for replies mode).
     * 
     * So, when newestLast is false, regardless of the current sortOrder, olderMessages are conceptually *below*
     * the visible set of messages.
     * 
     * When newestLast is true (as in replies mode), regardless of the current sortOrder, olderMessages are conceptually
     * *above* the visible set of messages.
     */
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
            || this.sourceFilterMode !== FilterMode.ALL
            || this.heldMessages.length > 0;
    }

    get shouldHoldNewMessages() {
        if (this.customSortEnabled)
            return true;
        if (this.holdNewMessages || this.isViewingMore) {
            console.log(`holding due to settings`);
            return true;
        }

        if (this.enableHoldOnClick && this.messageClicked)
            return true;

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
        this.customSortEnabled = (value?.sortOrder ?? CommentsOrder.NEWEST) !== CommentsOrder.NEWEST;
        this.newMessages = [];
        this.olderMessages = [];
        this.heldMessages = [];

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

        if (this.messages.length > this.maxVisibleMessages) {
            if (this.newestLast) {
                this.previousMessages.push(...this.messages.splice(0, this.messages.length - this.maxVisibleMessages));
            } else {
                this.nextMessages.unshift(...this.messages.splice(this.maxVisibleMessages, this.messages.length));
            }
        }

        this.debugMessages();
        this.sortMessages();
        if (this.markSourceLoaded)
            this.markSourceLoaded();
    }

    debugMessages() {
        if (!this.showDebug)
            return;
        
        // console.log([ 
        //     ...this.previousMessages.map(x => x.message), 
        //     '[[',
        //     ...this.messages.map(x => x.message),
        //     ']]',
        //     ...this.nextMessages.map(x => x.message) 
        // ].map(x => /\d+/.test(x) ? this.zeroPad(x, 2) : x).join(" "));
    }

    zeroPad(number: number | string, count: number = 2) {
        let str: string;
    
        if (typeof number === 'number')
            str = String(number);
        else
            str = number;
    
        while (str.length < count)
            str = '0' + str;
    
        return str;
    }
    leftPad(str: string, count: number = 2) {
        while (str.length < count)
            str = ' ' + str;
    
        return str;
    }
    
    messageIdentity(index: number, chatMessage: ChatMessage) {
        return chatMessage.id;
    }

    get sourceSortOrder() {
        return this.source?.sortOrder ?? CommentsOrder.NEWEST;
    }

    get sourceFilterMode() {
        return this.source?.filterMode ?? FilterMode.ALL;
    }

    /**
     * Show the newest content.
     * - If an unnatural sort order is active (ie Oldest or Likes), it will be changed to Newest.
     * - The new content will be placed where new content goes based on newestLast (replies mode), so if it is true, the content is 
     *   placed at the end, otherwise it is placed at the beginning.
     * 
     * @param event 
     * @returns 
     */
    async showNewest(event: MouseEvent) {

        // Regardless of how we handle this, clear out our held messages

        this.heldMessages = [];
        this.messageClicked = false;

        // If the sort order is not already Newest, switch to Newest and stop.
        // The act of changing the sort order will cause the newest content to be loaded.

        let naturalOrder = CommentsOrder.NEWEST;
        if (this.sourceSortOrder !== naturalOrder || this.sourceFilterMode !== FilterMode.ALL) {
            if (this.sourceSortOrder !== naturalOrder)
                this._sortOrderChanged.next(naturalOrder);
            if (this.sourceFilterMode !== FilterMode.ALL)
                this._filterModeChanged.next(FilterMode.ALL);
            return;
        }

        // On this path, we are already on Newest, but there is newer content available (such as when new content is 
        // being buffered due to user engagement on a comment)

        this.isViewingMore = false;

        // Move all newerMessages into messages, respecting the newestLast direction (normal or replies mode)

        if (this.newestLast)
            this.messages = this.messages.concat(this.newMessages.splice(0, this.newMessages.length));
        else
            this.messages = this.newMessages.splice(0, this.newMessages.length).concat(this.messages);

        let overflow = this.messages.splice(this.maxVisibleMessages, this.messages.length);
        this.olderMessages = overflow.concat(this.olderMessages);
        this.olderMessages.splice(this.maxMessages - this.maxVisibleMessages, this.olderMessages.length);
        this.hasMore = this.olderMessages.length > 0;

        // Scroll to the newest comment.
        
        if (this.messages.length > 0) {
            if (this.newestLast) {
                this.scrollToComment(this.messages[this.messages.length - 1].id);
            } else {
                this.scrollToComment(this.messages[0].id);
            }
        }
    }

    get showDebug() {
        if (typeof window === 'undefined')
            return false;

        return localStorage['banta:debug'] === '1';
    }

    get shouldShowNext() {
        if (!this.newestLast) {
            return this.hasMore || this.nextMessages.length > 0;
        }

        return this.nextMessages.length > 0;
    }

    get shouldShowPrevious() {
        if (this.newestLast) {
            return this.hasMore || this.previousMessages.length > 0;
        }

        return this.previousMessages.length > 0;
    }

    get pageSize() {
        return Math.min(20, this.maxVisibleMessages);
    }

    async showPrevious() {
        this.isViewingMore = true;
        let nextPageSize = this.pageSize;
        this.isLoadingMore = false;

        if (this.previousMessages.length > 0) {
            const storedMessages = this.previousMessages.splice(Math.max(0, this.previousMessages.length - nextPageSize), nextPageSize);
            this.messages = [...storedMessages, ...this.messages];
            nextPageSize -= storedMessages.length;
        }


        // Load more from backend if needed
        // Note: Backend only supports fetching more content in one direction.

        let lastMessage = this.previousMessages[0] ?? this.messages[0];

        if (nextPageSize > 0 && this.newestLast && lastMessage) {
            this.isLoadingMore = true;

            let messages = await this.source.loadAfter(lastMessage, nextPageSize);

            messages = messages.slice().reverse(); // because newestLast === true
            messages.forEach(m => m.transientState ??= {});

            // In replies mode (newestLast), we want to put these new messages onto the *top* of the set of visible messages.
            // Otherwise we want to put them on the *bottom*.

            this.messages = [...messages, ...this.messages];

            // If we didn't receive any messages at all, there's no more to fetch.

            if (messages.length === 0)
                this.hasMore = false;

            this.isLoadingMore = false;
        }
        
        // Extract the messages that do not fit in the maxVisibleMessages buffer.

        if (this.messages.length > this.maxVisibleMessages) {
            let overflow = this.messages.splice(this.maxVisibleMessages, this.messages.length);
            this.nextMessages.unshift(...overflow);
            if (this.nextMessages.length > this.maxMessages)
                this.nextMessages.splice(this.maxMessages, this.nextMessages.length);
        }

        this.debugMessages();
    }

    get sortNextLabel() {
        if (this.sourceSortOrder === 'newest') {
            return 'Older';
        } else if (this.sourceSortOrder === 'oldest') {
            return 'Newer';
        } else if (this.sourceSortOrder === 'likes') {
            return 'Less Likes';
        }

        return 'More';
    }

    get sortPreviousLabel() {
        if (this.sourceSortOrder === 'newest') {
            return 'Newer';
        } else if (this.sourceSortOrder === 'oldest') {
            return 'Older';
        } else if (this.sourceSortOrder === 'likes') {
            return 'More Likes';
        }

        return 'More';
    }

    get nextLabel() { return this.newestLast ? this.sortPreviousLabel : this.sortNextLabel; }
    get previousLabel() { return this.newestLast ? this.sortNextLabel : this.sortPreviousLabel; }

    /**
     * Show more content
     * - When in replies mode (newestLast), the content is added at the top
     * - When in normal mode, the content is added at the bottom
     * - The current sort order does *not* factor in here, which is why it is showMore() not showEarlier().
     * 
     * @returns 
     */
    async showNext() {
        this.isViewingMore = true;

        let nextPageSize = this.pageSize;

        this.isLoadingMore = false;

        if (this.nextMessages.length > 0) {
            const storedMessages = this.nextMessages.splice(0, nextPageSize);
            this.messages = [ ...this.messages, ...storedMessages ];
            nextPageSize -= storedMessages.length;
        }

        const lastMessage = this.olderMessages[this.olderMessages.length - 1] ?? this.messages[this.messages.length - 1];

        if (nextPageSize > 0 && !this.newestLast && lastMessage) {
            // Load more from backend

            this.isLoadingMore = true;

            let messages = await this.source.loadAfter(lastMessage, nextPageSize);
            messages.forEach(m => m.transientState ??= {});
            this.messages = [ ...this.messages, ...messages ];

            // If we didn't receive any messages at all, there's no more to fetch.

            if (messages.length === 0)
                this.hasMore = false;

            this.isLoadingMore = false;
        }

        // Extract the messages that do not fit in the maxVisibleMessages buffer.

        
        if (this.messages.length > this.maxVisibleMessages) {
            let overflow = this.messages.splice(0, this.messages.length - this.maxVisibleMessages);

            // Regardless of the order (newestLast), newMessages represents the direction that is being pushed, since it's definition
            // depends on that order. Move overflowing messages into newMessages.
            
            this.previousMessages.push(...overflow);
            if (this.previousMessages.length > this.maxMessages)
                this.previousMessages.splice(0, this.previousMessages.length - this.maxMessages);
        }

        this.debugMessages();
    }

    /**
     * Show more content
     * - When in replies mode (newestLast), the content is added at the top
     * - When in normal mode, the content is added at the bottom
     * - The current sort order does *not* factor in here, which is why it is showMore() not showEarlier().
     * 
     * @returns 
     */
    async showMore() {
        this.isViewingMore = true;

        let nextPageSize = this.pageSize;

        this.isLoadingMore = false;

        if (this.olderMessages.length > 0) {
            const storedMessages = this.olderMessages.splice(0, nextPageSize);
            this.messages = this.messages.concat(storedMessages);
            nextPageSize -= storedMessages.length;
            this.hasMore = this.olderMessages.length > 0;
        }

            let lastMessage: ChatMessage;

            if (this.newestLast) {
                lastMessage = this.olderMessages[0] ?? this.messages[0];
            } else {
                lastMessage = this.olderMessages[this.olderMessages.length - 1] ?? this.messages[this.messages.length - 1];
            }

        if (nextPageSize > 0 && lastMessage) {
            // Load more from backend

            this.isLoadingMore = true;


            if (!lastMessage) {
                this.isLoadingMore = false;
                this.hasMore = false;
                return;
            }

            let messages = await this.source.loadAfter(lastMessage, nextPageSize);

            if (this.newestLast)
                messages = messages.slice().reverse();
            
            messages.forEach(m => m.transientState ??= {});

            // In replies mode (newestLast), we want to put these new messages onto the *top* of the set of visible messages.
            // Otherwise we want to put them on the *bottom*.

            if (this.newestLast) {
                this.messages = messages.concat(this.messages);
            } else {
                this.messages = this.messages.concat(messages);
            }

            // If we didn't receive any messages at all, there's no more to fetch.

            if (messages.length === 0) {
                this.hasMore = false;
            }

            this.isLoadingMore = false;
        }

        // Extract the messages that do not fit in the maxVisibleMessages buffer.

        if (this.messages.length > this.maxVisibleMessages) {
            let overflow: ChatMessage[] = [];
            if (this.newestLast)
                overflow = this.messages.splice(this.maxVisibleMessages, this.messages.length);
            else
                overflow = this.messages.splice(0, this.messages.length - this.maxVisibleMessages);

            // Regardless of the order (newestLast), newMessages represents the direction that is being pushed, since it's definition
            // depends on that order. Move overflowing messages into newMessages.
            
            this.newMessages = overflow.concat(this.newMessages);
            this.newMessages.splice(this.maxMessages - this.maxVisibleMessages, this.newMessages.length);
        }
    }

    private heldMessages: ChatMessage[] = [];

    private addMessage(message: ChatMessage) {

        if (!message.transientState)
            message.transientState ??= {};
        
        let destination = this.messages;
        let bucket = this.olderMessages;
        let newestLast = this.newestLast;

        if (this.shouldHoldNewMessages) {
            this.heldMessages.push(message);
            destination = this.newMessages;
            bucket = null;
        }

        // If we aren't on the newest sort order, new messages shouldn't be added at all
        if (this.sourceSortOrder !== CommentsOrder.NEWEST)
            return;

        
        if (newestLast) {
            destination.push(message);

            if (this.maxVisibleMessages > 0) {
                let overflow = destination.splice(this.maxVisibleMessages, destination.length);
                bucket?.push(...overflow);
            }
        } else {
            destination.unshift(message);
            
            if (this.maxVisibleMessages > 0) {
                let overflow = destination.splice(this.maxVisibleMessages, destination.length);
                bucket?.unshift(...overflow);
            }
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
