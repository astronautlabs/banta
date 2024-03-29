import { Component, Input, Output } from '@angular/core';
import { ChatMessage } from '@banta/common';
import { Subject, Observable } from 'rxjs';
import { ChatBackendBase } from '../chat-backend-base';

@Component({
    selector: 'banta-live-chat-message',
    template: `
        <banta-chat-message 
            *ngIf="message"
            [message]="message"
            (upvoted)="upvote()"
            (reported)="report()"
            (selected)="select()"
            ></banta-chat-message>
    `,
    styles: [``]
})
export class LiveChatMessageComponent {
    constructor(
        private backend : ChatBackendBase
    ) {

    }

    private _message : ChatMessage;
    private _upvoted = new Subject<void>();
    private _reported = new Subject<void>();
    private _selected = new Subject<void>();

    @Output()
    get upvoted() : Observable<void> {
        return this._upvoted;
    }
    
    @Output()
    get reported() : Observable<void> {
        return this._reported;
    }

    @Output()
    get selected() : Observable<void> {
        return this._selected;
    }
    
    @Input()
    get message() : ChatMessage {
        return this._message;
    }

    private unsubscribe : Function;

    set message(value) {
        let originalId = null;
        if (this._message)
            originalId = this._message.id;
        
        this._message = value;

        if (value && originalId === value.id) {
            return;
        }

        if (this.unsubscribe)
            this.unsubscribe();
        
        if (value) {
            this.unsubscribe = this.backend.watchMessage(value, message => this.message = message);
        }
    }

    report() {
        this._reported.next();
    }
    
    upvote() {
        this._upvoted.next();
    }

    select() {
        this._selected.next();
    }
}