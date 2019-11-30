import { Component, Input, Output, ElementRef, ViewChild } from "@angular/core";
import { Subject } from 'rxjs';

import { User, ChatSource, ChatMessage, NewMessageForm, ChatBackendService } from '../../model';
import { SubSink } from 'subsink';
import { ChatViewComponent } from '../chat-view/chat-view.component';

@Component({
    selector: 'engage-firehose',
    templateUrl: './firehose-chat.component.html',
    styleUrls: ['./firehose-chat.component.scss']
})
export class FirehoseChatComponent {
    constructor(
        private backend : ChatBackendService,
        private elementRef : ElementRef<HTMLElement>
    ) {
    }

    private _source : ChatSource;

    @Input()
    get source() : ChatSource {
        return this._source;
    }

    set source(value) {
        this._source = value;
    }
    
    private _selected = new Subject<ChatMessage>();
    private _reported = new Subject<ChatMessage>();
    private _upvoted = new Subject<ChatMessage>();
    showEmojiPanel = false;

    insertEmoji(emoji) {
        // TODO
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

    newMessage : NewMessageForm = {};

    sendMessage() {
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
            message: text
        };

        this.source.send(message);
    }
}