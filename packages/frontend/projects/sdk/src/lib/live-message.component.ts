import { Component, Input, Output } from "@angular/core";
import { ChatMessage } from './model';
import { Subject, Observable } from 'rxjs';

@Component({
    selector: 'engage-live-message',
    template: `
        <ng-container *ngIf="message">
            <engage-live-chat-message
                *ngIf="viewType === 'chat'"
                [message]="message"
                (upvoted)="upvote(message)"
                (reported)="report(message)"
                (selected)="select(message)">
            </engage-live-chat-message>

            <engage-live-comment 
                *ngIf="viewType === 'comment'"
                [message]="message"
                (upvoted)="upvote(message)"
                (reported)="report(message)"
                (selected)="select(message)">
            </engage-live-comment>
        </ng-container>
    `,
    styles: [``]
})
export class LiveMessageComponent {
    constructor() {

    }

    private _message : ChatMessage;
    private _upvoted = new Subject<void>();
    private _reported = new Subject<void>();
    private _selected = new Subject<void>();

    viewType : string;

    @Output() 
    get upvoted(): Observable<void> {
        return this._upvoted;
    }

    @Output() 
    get reported(): Observable<void> {
        return this._reported;
    }
    
    @Output() 
    get selected(): Observable<void> {
        return this._selected;
    }

    @Input()
    get message() : ChatMessage {
        return this._message;
    }

    set message(value) {
        this._message = value;
        this.viewType = this.getViewType(value);
    }

    private getViewType(message : ChatMessage) {
        if (message.topicId.endsWith('_firehose'))
            return 'chat';
        else if (message.topicId.endsWith('_thepoint'))
            return 'comment';

        return 'comment';
    }

    upvote() {
        this._upvoted.next();
    }

    report() {
        this._reported.next();
    }

    select() {
        this._selected.next();
    }

}