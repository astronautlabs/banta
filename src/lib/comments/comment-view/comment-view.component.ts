import { Component, Input, ViewChild, ElementRef, Output } from "@angular/core";
import { User, ChatMessage, ChatSource } from '../../model';
import { SubSink } from 'subsink';
import { Subject } from 'rxjs';

@Component({
    selector: 'engage-comment-view',
    templateUrl: './comment-view.component.html',
    styleUrls: ['./comment-view.component.scss']
})
export class CommentViewComponent {
    constructor() {

    }

    private _sourceSubs = new SubSink();
    private _source : ChatSource;
    private _selected = new Subject<ChatMessage>();
    private _upvoted = new Subject<ChatMessage>();
    private _reported = new Subject<ChatMessage>();

    @Input() 
    allowReplies = true;

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

    menuMessage : ChatMessage = null;
    messages : ChatMessage[] = [];
    currentUser : User;

    @Input()
    get source() {
        return this._source;
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

    set source(value) {
        if (this._sourceSubs) {
            this._sourceSubs.unsubscribe();
            this._sourceSubs = null;
        }
        this._source = value;

        if (value) {
            let messages = value.messages || [];

            this._sourceSubs = new SubSink();
            this.messages = messages.slice();

            this._sourceSubs.add(
                this._source.messageReceived
                    .subscribe(msg => this.messageReceived(msg)),
                this._source.messageSent
                    .subscribe(msg => this.messageSent(msg)),
                this._source.currentUserChanged
                    .subscribe(user => this.currentUser = user)
            );
        }
    }

    @Input()
    genericAvatarUrl : string;
    
    @ViewChild('messageContainer', { static: false })
    messageContainer : ElementRef<HTMLElement>;

    @Input()
    maxMessages = 200;

    @Input()
    newestLast = false;

    private addMessage(message : ChatMessage) {
        if (this.newestLast) {
            while (this.messages.length + 1 > this.maxMessages)
                this.messages.shift();
                
            this.messages.push(message);
        } else {
            while (this.messages.length + 1 > this.maxMessages)
                this.messages.pop();
                
            this.messages.unshift(message);
        }
    }

    private messageReceived(message : ChatMessage) {
        this.addMessage(message);

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
        this.addMessage(message);
        
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

    avatarForUser(user : User) {
        let url = this.genericAvatarUrl;

        if (user && user.avatarUrl)
            url = user.avatarUrl;
        
        return `url(${url})`;
    }
}