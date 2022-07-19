import { Component, Input, ViewChild, ElementRef, Output } from "@angular/core";
import { User, ChatMessage } from '@banta/common';
import { Subject, Subscription } from 'rxjs';
import { ChatBackendBase } from "../../chat-backend-base";
import { ChatSourceBase } from "../../chat-source-base";

@Component({
    selector: 'banta-chat-view',
    templateUrl: './chat-view.component.html',
    styleUrls: ['./chat-view.component.scss']
})
export class ChatViewComponent {
    constructor(
        private backend: ChatBackendBase,
        private elementRef : ElementRef<HTMLElement>
    ) {

    }

    private _sourceSubs = new Subscription();
    private _source : ChatSourceBase;

    @Input()
    get source() {
        return this._source;
    }

    private _selected = new Subject<ChatMessage>();
    private _reported = new Subject<ChatMessage>();
    private _upvoted = new Subject<ChatMessage>();
    private _userSelected = new Subject<ChatMessage>();

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

    set source(value) {
        if (this._sourceSubs) {
            this._sourceSubs.unsubscribe();
            this._sourceSubs = null;
        }

        this._source = value;

        this.messages = [];

        if (value) {
            this._sourceSubs = new Subscription();
            this.messages = value.messages.slice();

            console.log(`Source set:`);
            console.dir(value);

            console.log(`Messages loaded:`);
            console.dir(this.messages); 
            
            this._sourceSubs.add(this._source.messageReceived.subscribe(msg => this.messageReceived(msg)));
            this._sourceSubs.add(this._source.messageSent.subscribe(msg => this.messageSent(msg)));

            this._sourceSubs.add(
                this.backend.userChanged
                    .subscribe(user => this.currentUser = user)
            );
        }
    }

    messages : ChatMessage[] = [];
    currentUser : User;

    @ViewChild('messageContainer')
    messageContainer : ElementRef<HTMLElement>;

    @Input()
    maxMessages : number = 200;

    private addMessage(message : ChatMessage) {
        if (this.messages.length > this.maxMessages + 1) {
            while (this.messages.length > this.maxMessages)
                this.messages.shift();
        }

        this.messages.push(message);
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

        setTimeout(() => this.scrollToLatest());
    }

    scrollToLatest() {
        if (!this.messageContainer)
            return;
        
        let el = this.messageContainer.nativeElement;
        el.scrollTop = el.scrollHeight;
    }

    jumpTo(message : ChatMessage) {
        let element = this.elementRef.nativeElement;
        let messageElement = element.querySelector(`banta-chat-message[data-id="${message.id}"]`)

        if (!messageElement) {
            alert(`could not find message ${message.id}`);
            return;
        }

        messageElement.scrollIntoView({ behavior: 'smooth' });

        this.flashMessage(message);
    }

    flashMessage(message : ChatMessage) {
        if (!message)
            return;
        
        this.flashedMessageId = message.id;
        //setTimeout(() => this.flashedMessageId = null, 250);
    }

    flashedMessageId : string;


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

    selectMessageUser(message : ChatMessage) {
        this._userSelected.next(message);
    }

    avatarForUser(user : User) {
        if (user && user.avatarUrl) {
            let url = user.avatarUrl;
            return `url(${url})`;
        }

        return null;
    }
}