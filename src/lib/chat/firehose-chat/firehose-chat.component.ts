import { Component, Input, Output } from "@angular/core";
import { Subject } from 'rxjs';

import { ChatUser, ChatSource, ChatMessage, NewMessageForm } from '../../model';
import { SubSink } from 'subsink';

@Component({
    selector: 'engage-firehose',
    templateUrl: './firehose-chat.component.html',
    styleUrls: ['./firehose-chat.component.scss']
})
export class FirehoseChatComponent {

    private _source : ChatSource;

    @Input()
    get source() : ChatSource {
        return this._source;
    }

    private _sourceSink : SubSink;

    set source(value) {
        if (this._sourceSink) {
            this._sourceSink.unsubscribe();
            this._sourceSink = null;
        }

        this._source = value;

        this._sourceSink = new SubSink();
        this._sourceSink.add(
            this._source.currentUserChanged.subscribe(user => {
                this._user = user;
            })
        );
    }
    
    private _user : ChatUser = null;
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
            user: this._user,
            upvotes: 0,
            message: text
        };

        this.source.send(message);
    }
}