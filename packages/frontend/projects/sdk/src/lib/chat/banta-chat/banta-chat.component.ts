import { Component, Input, Output, ViewChild, ElementRef } from "@angular/core";
import { Subject, Observable, Subscription } from 'rxjs';

import { User, ChatMessage, NewMessageForm } from '@banta/common';
import { ChatViewComponent } from '../chat-view/chat-view.component';
import { ChatBackendBase } from "../../chat-backend-base";
import { ChatSourceBase } from "../../chat-source-base";

/**
 * Chat component
 */
@Component({
    selector: 'banta-chat',
    templateUrl: './banta-chat.component.html',
    styleUrls: ['./banta-chat.component.scss']
})
export class BantaChatComponent {
    constructor(
        private backend : ChatBackendBase
    ) {
    }

    private _source : ChatSourceBase;
    private _subs = new Subscription();
    user : User = null;

    @Input() shouldInterceptMessageSend?: (message: ChatMessage, source: ChatSourceBase) => boolean | Promise<boolean>;
    @Input() url: string;

    ngOnInit() {
        this._subs.add(this.backend.userChanged.subscribe(user => this.user = user));
    }

    ngOnDestroy() {
        this._subs.unsubscribe();
    }

    @Input()
    get source() : ChatSourceBase {
        return this._source;
    }

    set source(value) {
        this._source = value;
    }

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
    }

    @Input() signInLabel = 'Sign In';
    @Input() sendLabel = 'Send';
    @Input() permissionDeniedLabel = 'Send';
    @Input() messageFieldPlaceholder = 'Chat';
    @Input() emptyLabel = 'Be the first to chat';

    private _selected = new Subject<ChatMessage>();
    private _selected$ = this._selected.asObservable();
    private _reported = new Subject<ChatMessage>();
    private _reported$ = this._reported.asObservable();
    private _upvoted = new Subject<ChatMessage>();
    private _upvoted$ = this._upvoted.asObservable();
    private _userSelected = new Subject<ChatMessage>();
    private _userSelected$ = this._userSelected.asObservable();
    private _permissionDeniedError = new Subject<string>();
    private _permissionDeniedError$ = this._permissionDeniedError.asObservable();
    private _signInSelected = new Subject<void>();
    private _signInSelected$ = this._signInSelected.asObservable();
    private _received = new Subject<ChatMessage>();
    private _received$ = this._received.asObservable();

    @Output() get selected() { return this._selected$; }
    @Output() get reported() { return this._reported$; }
    @Output() get upvoted() { return this._upvoted$; }
    @Output() get userSelected() { return this._userSelected$; }
    @Output() get permissionDeniedError() { return this._permissionDeniedError$; }
    @Output() get signInSelected() { return this._signInSelected$; }
    @Output() get received() { return this._received$; }

    onReceived(message: ChatMessage) {
        this._received.next(message);
    }

    showEmojiPanel = false;

    showSignIn() {
        this._signInSelected.next();
    }

    sendPermissionError(message: string) {
        this._permissionDeniedError.next(message);
    }

    insertEmoji(emoji) {
        let message = this.newMessage.message || '';

        this.newMessage.message = message + emoji;
    }

    onKeyDown(event : KeyboardEvent) {
        // TODO
    }

    @ViewChild('chatView') chatView : ChatViewComponent;
    @ViewChild('input') inputElementRef: ElementRef<HTMLInputElement>;

    jumpToMessage(message : ChatMessage) {
        if (this.chatView)
            this.chatView.jumpTo(message);
    }

    select(message : ChatMessage) {
        this._selected.next(message);
    }

    selectUser(message : ChatMessage) {
        this._userSelected.next(message);
    }

    report(message : ChatMessage) {
        this._reported.next(message);
    }

    async upvote(message : ChatMessage) {
        await this.source.likeMessage(message.id);
        this._upvoted.next(message);
    }

    get canChat() {
        if (!this.user)
            return false;

        // TODO
        // if (!this.user.permissions)
        //     return true;

        // if (!this.user.permissions.canChat)
        //     return true;

        // return this.user.permissions?.canChat(this.source);
        
        return true;
    }

    newMessage : NewMessageForm = {};

    async sendMessage() {
        if (!this.source)
            return;

        let text = (this.newMessage.message || '').trim();
        this.newMessage.message = '';

        if (text === '')
            return;

        let message : ChatMessage = {
            user: null,
            sentAt: Date.now(),
            likes: 0,
            url: this.url ?? (typeof window !== 'undefined' ? location.href : undefined),
            message: text
        };

        try {
            const intercept = await this.shouldInterceptMessageSend?.(message, this.source);
            if (!intercept) {
                await this.source.send(message);
            }

            this.chatView.scrollToLatest();
            this.inputElementRef.nativeElement.focus();
        } catch (e) {
            console.error(`Failed to send message: `, message);
            console.error(e);
        }
    }
}
