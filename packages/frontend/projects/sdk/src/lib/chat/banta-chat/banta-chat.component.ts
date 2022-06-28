import { Component, Input, Output, ElementRef, ViewChild } from "@angular/core";
import { Subject, Observable, Subscription } from 'rxjs';

import { User, ChatSource, ChatMessage, NewMessageForm, UserAccount } from '@banta/common';
import { ChatViewComponent } from '../chat-view/chat-view.component';
import { BantaService, ChatBackendService } from "../../common";

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
        private banta : BantaService,
        private backend : ChatBackendService,
        private elementRef : ElementRef<HTMLElement>
    ) {
    }

    private _source : ChatSource;
    private _subs = new Subscription();
    user : UserAccount = null;

    @Input() shouldInterceptMessageSend?: (message: ChatMessage, source: ChatSource) => boolean | Promise<boolean>;


    ngOnInit() {
        this._subs.add(this.banta.userChanged.subscribe(user => this.user = user));
    }

    ngOnDestroy() {
        this._subs.unsubscribe();
    }

    @Input()
    get source() : ChatSource {
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

    private _selected = new Subject<ChatMessage>();
    private _reported = new Subject<ChatMessage>();
    private _upvoted = new Subject<ChatMessage>();
    private _userSelected = new Subject<ChatMessage>();
    private _signInSelected = new Subject<void>();
    private _permissionDeniedError = new Subject<void>();

    @Output()
    get signInSelected(): Observable<void> {
        return this._signInSelected;
    }

    @Output()
    get permissionDeniedError(): Observable<void> {
        return this._permissionDeniedError;
    }

    showEmojiPanel = false;

    showSignIn() {
        this._signInSelected.next();
    }

    sendPermissionError() {
        this._permissionDeniedError.next();
    }

    insertEmoji(emoji) {
        let message = this.newMessage.message || '';

        this.newMessage.message = message + emoji;
    }

    onKeyDown(event : KeyboardEvent) {
        // TODO
    }

    @ViewChild('chatView', { static: true })
    chatView : ChatViewComponent;

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

    upvote(message : ChatMessage) {
        this._upvoted.next(message);
    }

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

    @Output()
    get userSelected() {
        return this._userSelected;
    }

    get canChat() {
        if (!this.user)
            return false;

        if (!this.user.permissions)
            return true;

        if (!this.user.permissions.canChat)
            return true;

        return this.user.permissions?.canChat(this.source);
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
            upvotes: 0,
            url: location.href,
            message: text
        };

        try {
            const intercept = await this.shouldInterceptMessageSend?.(message, this.source);
            if (!intercept) {
                await this.source.send(message);
            }
        } catch (e) {
            console.error(`Failed to send message: `, message);
            console.error(e);
        }
    }
}
