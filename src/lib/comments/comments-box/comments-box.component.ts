import { Component, Input, Output } from '@angular/core';
import { User, ChatSource, ChatMessage } from '../../model';
import { Subject } from 'rxjs';
import { SubSink } from 'subsink';

@Component({
    selector: 'engage-comments',
    templateUrl: './comments-box.component.html',
    styleUrls: ['./comments-box.component.scss']
})
export class CommentsBoxComponent {
    constructor() {
        
    }

    private _upvoted = new Subject<ChatMessage>();
    private _reported = new Subject<ChatMessage>();
    private _selected = new Subject<ChatMessage>();
    private _source : ChatSource;

    @Input()
    get source() : ChatSource {
        return this._source;
    }

    set source(value) {
        this._source = value;

        if (this.sourceSink) {
            this.sourceSink.unsubscribe();
            this.sourceSink = null;
        }

        if (this._source) {
            this.sourceSink = new SubSink();
            this.sourceSink.add(
                this._source.currentUserChanged
                    .subscribe(user => this.currentUser = user)
            );
        }
    }

    private sourceSink : SubSink;

    currentUser : User;
    newMessageText : string;

    @Output()
    get upvoted() {
        return this._upvoted;
    }
    
    @Output()
    get reported() {
        return this._reported;
    }

    @Output()
    get selected() {
        return this._selected;
    }

    onKeyDown(event : KeyboardEvent) {
    }

    sendMessage() {
        if (!this.source)
            return;
        
        let text = (this.newMessageText || '').trim();
        this.newMessageText = '';

        if (text === '')
            return;

        let message : ChatMessage = { 
            user: this.currentUser,
            sentAt: Date.now(),
            upvotes: 0,
            message: text
        };

        this.source.send(message);
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
}