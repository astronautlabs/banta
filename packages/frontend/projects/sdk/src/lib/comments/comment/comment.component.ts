import { Component, Output, Input, HostBinding, ElementRef } from "@angular/core";
import { Subject } from 'rxjs';
import { ChatMessage, ChatPermissions, User } from '@banta/common';
import { MessageMenuItem } from "../../message-menu-item";
import { take } from 'rxjs/operators';
import { PinOptions } from "../../chat-source";

@Component({
    selector: 'banta-comment',
    templateUrl: './comment.component.html',
    styleUrls: ['./comment.component.scss']
})
export class CommentComponent {
    constructor(
        private elementRef: ElementRef<HTMLElement>
    ) {
    }

    ngOnInit() {
        let maxTime = 100;
        let minTime = 0;
        let randomTime = minTime + Math.random() * (maxTime - minTime);

        setTimeout(() => {
            this.isNew = true;
            this.visible = true;
            setTimeout(() => this.isNew = false, 1000);
        }, randomTime);
    }

    //#region Message

    @Input() get message() { return this._message; }
    set message(value) { this.setMessage(value); }
    private _message : ChatMessage;

    //#endregion
    //#region Properties
    
    private isLoaded = false;
    editedMessage: string;
    pinFormVisible = false;
    pinUntilDate: Date;
    pinUntilTime: string;
    pinMode: 'forever' | 'until';
    today = new Date();

    //#endregion
    //#region Inputs
    
    @Input() customMenuItems: MessageMenuItem[];
    @Input() showReplyAction = true;
    @Input() maxLength: number = 1500;
    @Input() permissions: ChatPermissions;
    @Input() mine = false;
    @Input() editing = false;
    @Input() genericAvatarUrl: string;
    @Input() readonly = false;

    //#endregion
    //#region Outputs

    private _reported = new Subject<void>();
    private _selected = new Subject<void>();
    private _liked = new Subject<void>();
    private _unliked = new Subject<void>();
    private _shared = new Subject<ChatMessage>();
	private _userSelected = new Subject<void>();
	private _avatarSelected = new Subject<User>();
	private _usernameSelected = new Subject<User>();
    private _editStarted = new Subject<void>();
    private _deleted = new Subject<void>();
    private _editEnded = new Subject<void>();
    private _edited = new Subject<string>();
    private _loaded = new Subject<void>();
    private _pinned = new Subject<{ message: ChatMessage, options: PinOptions }>();
    private _unpinned = new Subject<ChatMessage>();
    
    @Output() readonly liked = this._liked.asObservable();
    @Output() readonly unliked = this._unliked.asObservable();
    @Output() readonly selected = this._selected.asObservable();
    @Output() readonly edited = this._edited.asObservable();
    @Output() readonly deleted = this._deleted.asObservable();
    @Output() readonly editStarted = this._editStarted.asObservable();
    @Output() readonly editEnded = this._editEnded.asObservable();
    @Output() readonly shared = this._shared.asObservable();
	@Output() readonly userSelected = this._userSelected.asObservable();
    @Output() readonly usernameSelected = this._usernameSelected.asObservable();
	@Output() readonly avatarSelected = this._avatarSelected.asObservable();
    @Output() readonly reported = this._reported.asObservable();
    @Output() readonly loaded = this._loaded.asObservable();
    @Output() readonly pinned = this._pinned.asObservable();
    @Output() readonly unpinned = this._unpinned.asObservable();

    //#endregion
    //#region UI Bindings

    @HostBinding('attr.data-comment-id') get commentId() { return this.message?.id; }
    @HostBinding('class.new') isNew = false;
    @HostBinding('class.highlighted') get isHighlighted() { return this.message?.transientState?.highlighted ?? false; }
    @HostBinding('class.visible') visible = false;

    get replyCount() { return this.message.submessages?.length || this.message.submessageCount || 0; }
    get element() { return this.elementRef.nativeElement; }
    @HostBinding('class.pinned') 
    get isPinned() { 
        return this.message.pinned && (!this.message.pinnedUntil || this.message.pinnedUntil > Date.now());
    }

    get pinFormValid() {
        if (!this.pinMode)
            return false;

        if (this.pinMode === 'until') {
            return !!this.pinUntilDate && !!this.pinUntilTime;
        }

        return true;
    }

    avatarForUser(user : User) { return `url(${user?.avatarUrl ?? this.genericAvatarUrl})`; }

    //#endregion
    //#region Public Component API

    async waitForLoad() {
        await this.isLoaded ? Promise.resolve() : this.loaded.pipe(take(1)).toPromise();
    }

    //#endregion
    //#region Private API
    
    private setMessage(value: ChatMessage) {
        this._message = value;
        if (this._message.attachments?.length > 0) {
            this.isLoaded = false;
        } else {
            this.isLoaded = true;
            this._loaded.next();
        }
    }

    //#endregion
    //#region Actions

    markAttachmentsLoaded() { this.isLoaded = true; this._loaded.next(); }
    saveEdit() { this._edited.next(this.editedMessage); }
    endEditing() { this._editEnded.next(); }
    delete() { this._deleted.next(); }
    report() { this._reported.next(); }
    like() { this._liked.next(); }
    unlike() { this._unliked.next(); }
    share() { this._shared.next(this.message); }
    unpin() { this._unpinned.next(this.message); }
    select() { this._selected.next(); }
	selectUser() { this._userSelected.next(); }
    startEdit() { this._editStarted.next(); this.editedMessage = this.message.message;  }
    selectUsername(user: User) { this._usernameSelected.next(user); this.selectUser(); }
	selectAvatar(user: User) { this._avatarSelected.next(user); this.selectUser(); }
    
    showPinForm() {
        this.pinFormVisible = true;
        this.pinUntilTime = '08:00';
    }

    submitPin() {
        let pinUntil: number;
        if (this.pinMode === 'until') {
            let date = new Date(this.pinUntilDate);
            let [hour, minute] = this.pinUntilTime.split(':');
            date.setHours(Number(hour));
            date.setMinutes(Number(minute));
            pinUntil = date.getTime();
        }
        
        this.pinFormVisible = false;
        this._pinned.next({
            message: this.message,
            options: {
                until: pinUntil
            }
        })
    }

    //#endregion
}
