import { Component, Input, ViewChild, ElementRef, Output } from "@angular/core";
import { ChatMessage } from '../chat-message';
import { ChatUser } from '../chat-user';
import { ChatSource } from '../chat-source';
import { SubSink } from 'subsink';
import { Subject } from 'rxjs';

@Component({
    selector: 'engage-chat-view',
    templateUrl: './chat-view.component.html',
    styleUrls: ['./chat-view.component.scss']
})
export class ChatViewComponent {
    constructor() {

    }

    private _sourceSubs = new SubSink();
    private _source : ChatSource;

    @Input()
    get source() {
        return this._source;
    }

    private _selected = new Subject<ChatMessage>();
    private _reported = new Subject<ChatMessage>();
    private _upvoted = new Subject<ChatMessage>();

    @Output()
    get selected() {
        return this._selected;
    }

    @Output()
    get reported() {
        return this._reported;
    }

    @Output()
    get upvoted() {
        return this._upvoted;
    }

    set source(value) {
        this._sourceSubs.unsubscribe();
        this._sourceSubs = new SubSink();
        this._source = value;

        this.messages = value.messages.slice();

        this._sourceSubs.add(
            this._source.messageReceived
                .subscribe(msg => this.messageReceived(msg)),
            this._source.messageSent
                .subscribe(msg => this.messageSent(msg)),
            this._source.currentUserChanged
                .subscribe(user => this.currentUser = user)
        );
    }

    messages : ChatMessage[] = [];
    currentUser : ChatUser;

    @ViewChild('messageContainer', { static: false })
    messageContainer : ElementRef<HTMLElement>;

    private messageReceived(message : ChatMessage) {
        this.messages.push(message);

        if (this.isScrolledToLatest())
            setTimeout(() => this.scrollToLatest());
    }

    isScrolledToLatest() {
        if (!this.messageContainer)
            return false;

        let el = this.messageContainer.nativeElement;
        let currentScroll = el.scrollTop;
        let currentTotal = el.scrollHeight - el.offsetHeight;
    
        return currentScroll > currentTotal - 10;
    }

    private messageSent(message : ChatMessage) {
        this.messages.push(message);
        
        if (!this.messageContainer)
            return;

        this.scrollToLatest();
    }

    scrollToLatest() {
        if (!this.messageContainer)
            return;
        
        let el = this.messageContainer.nativeElement;
        el.scrollTop = el.scrollHeight;
    }

    mentionsMe(message : ChatMessage) {
        if (!this.currentUser)
            return false;

        if (message.message.includes(`@${this.currentUser.username}`))
            return true;
        
        return false;
    }
    
    upvoteMessage(message : ChatMessage) {
        this._upvoted.next(message);
    }

    reportMessage(message : ChatMessage) {
        this._reported.next(message);
    }

    selectMessage(message : ChatMessage) {
        this._selected.next(message);
    }

    avatarForUser(user : ChatUser) {
        if (user && user.avatarUrl) {
            let url = user.avatarUrl;
            return `url(${url})`;
        }

        return null;
    }
}