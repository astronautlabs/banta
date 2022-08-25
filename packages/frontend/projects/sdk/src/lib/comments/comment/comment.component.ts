import { Component, Output, Input, HostBinding, ViewChild } from "@angular/core";
import { Subject } from 'rxjs';
import { ChatMessage, ChatMessageAttachment, ChatPermissions, User } from '@banta/common';
import { LightboxComponent } from "../../common/lightbox/lightbox.component";

@Component({
    selector: 'banta-comment',
    templateUrl: './comment.component.html',
    styleUrls: ['./comment.component.scss']
})
export class CommentComponent {
    private _reported = new Subject<void>();
    private _selected = new Subject<void>();
    private _liked = new Subject<void>();
    private _unliked = new Subject<void>();

    private _shared = new Subject<ChatMessage>();

	private _userSelected = new Subject<void>();
	private _avatarSelected = new Subject<User>();
	private _usernameSelected = new Subject<User>();

    ngOnInit() {
        let maxTime = 500;
        let minTime = 0;
        let randomTime = minTime + Math.random() * (maxTime - minTime);

        setTimeout(() => {
            this.isNew = true;
            this.visible = true;
            setTimeout(() => this.isNew = false, 1000);
        }, randomTime);
    }

    @HostBinding('class.new')
    isNew = false;

    @HostBinding('class.highlighted')
    get isHighlighted() {
        return this.message?.transientState?.highlighted ?? false;
    }

    @HostBinding('class.visible')
    visible = false;

    @Input()
    message : ChatMessage;

    @Input()
    showReplyAction = true;

	@Output()
    get userSelected() {
        return this._userSelected.asObservable();
    }

    @Output()
    get usernameSelected() {
        return this._usernameSelected.asObservable();
    }

	@Output()
	get avatarSelected() {
		return this._avatarSelected.asObservable();
	}

    @Output()
    get reported() {
        return this._reported.asObservable();
    }

    @Input() permissions: ChatPermissions;
    @Input() mine = false;
    
    @Input() editing = false;
    editedMessage: string;

    saveEdit() {
        this._edited.next(this.editedMessage);
    }

    endEditing() {
        this._editEnded.next();
    }

    startEdit() {
        this._editStarted.next();
        this.editedMessage = this.message.message;
    }

    delete() {
        this._deleted.next();
    }

    @Output()
    get liked() {
        return this._liked.asObservable();
    }

    @Output()
    get unliked() {
        return this._unliked.asObservable();
    }

    @Output()
    get selected() {
        return this._selected.asObservable();
    }

    private _editStarted = new Subject<void>();
    private _deleted = new Subject<void>();
    private _editEnded = new Subject<void>();
    private _edited = new Subject<string>();
    

    @Output() get edited() { return this._edited.asObservable(); }
    @Output() get deleted() { return this._deleted.asObservable(); }
    @Output() get editStarted() { return this._editStarted.asObservable(); }
    @Output() get editEnded() { return this._editEnded.asObservable(); }
    @Output() get shared(){ return this._shared.asObservable(); }

    @Input() genericAvatarUrl: string;

    @HostBinding('attr.data-comment-id') get commentId() { return this.message?.id; }

    report() {
        this._reported.next();
    }

    like() {
        this._liked.next();
    }

    unlike() {
        this._unliked.next();
    }

    share() {
        this._shared.next(this.message);
    }

    select() {
        this._selected.next();
    }

	selectUser() {
        this._userSelected.next();
    }

    selectUsername(user: User) {
        this._usernameSelected.next(user);
		this.selectUser();
    }

	selectAvatar(user: User) {
		this._avatarSelected.next(user);
		this.selectUser();
	}

    avatarForUser(user : User) {
        let url = this.genericAvatarUrl;

        if (user && user.avatarUrl) {
            url = user.avatarUrl;
        }

        return `url(${url})`;
    }

    get replyCount() {
        return this.message.submessages?.length || this.message.submessageCount || 0;
    }
}
