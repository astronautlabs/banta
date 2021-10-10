import { Component, Input, Output } from '@angular/core';
import { User, ChatSource, ChatMessage, UserAccount } from '@banta/common';
import { Subject, Observable } from 'rxjs';
import { SubSink } from 'subsink';
import { ChatBackendService } from '../../chat-backend.service';
import { BantaService } from '../../common';

/**
 * Comments component
 */
@Component({
    selector: 'banta-comments',
    templateUrl: './banta-comments.component.html',
    styleUrls: ['./banta-comments.component.scss']
})
export class BantaCommentsComponent {
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

    showSignIn() {
        this._signInSelected.next();
    }

    user : UserAccount;
    newMessageText : string;

    @Input() signInLabel = 'Sign In';
    @Input() sendLabel = 'Send';
    @Input() permissionDeniedLabel = 'Send';

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

    showPermissionDenied() {
        this._permissionDeniedError.next();
    }
    
    get canComment() {
        if (!this.user.permissions)
            return true;
        
        return this.user.permissions?.canComment(this.source);
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

    async sendMessage() {
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

        try {
            await this.source.send(message);
        } catch (e) {
            console.error(`Failed to send message: `, message);
            console.error(e);
        }
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