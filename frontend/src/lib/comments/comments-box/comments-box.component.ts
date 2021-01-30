import { Component, Input, Output } from '@angular/core';
import { User, ChatSource, ChatMessage, ChatBackendService } from '../../model';
import { Subject, Observable } from 'rxjs';
import { SubSink } from 'subsink';
import { BantaService } from '../../common';

@Component({
    selector: 'engage-comments',
    templateUrl: './comments-box.component.html',
    styleUrls: ['./comments-box.component.scss']
})
export class CommentsBoxComponent {
    constructor(
        private banta : BantaService,
        private backend : ChatBackendService
    ) {
    }

    private _upvoted = new Subject<ChatMessage>();
    private _reported = new Subject<ChatMessage>();
    private _selected = new Subject<ChatMessage>();
    private _userSelected = new Subject<ChatMessage>();
    private _source : ChatSource;

    private _subs = new SubSink();

    ngOnInit() {
        this._subs.add(
            this.banta.userChanged.subscribe(user => this.user = user)
        )
    }

    ngOnDestroy() {
        this._subs.unsubscribe();
    }

    @Input()
    get source() : ChatSource {
        return this._source;
    }

    showSignIn() {
        this._signInSelected.next();
    }

    set source(value) {
        this._source = value;
    }

    user : User;
    newMessageText : string;

    private _signInSelected = new Subject<void>();

    @Output()
    get signInSelected(): Observable<void> {
        return this._signInSelected;
    }
    
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
    @Output()
    get userSelected() {
        return this._userSelected;
    }

    onKeyDown(event : KeyboardEvent) {
    }

    insertEmoji(text : string) {
        this.newMessageText += text;
    }

    sendMessage() {
        if (!this.source)
            return;
        
        let text = (this.newMessageText || '').trim();
        this.newMessageText = '';

        if (text === '')
            return;

        let message : ChatMessage = { 
            user: this.user,
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

    selectMessageUser(message : ChatMessage) {
        this._userSelected.next(message);
    }
}