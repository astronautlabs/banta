import { Component, Output, Input, HostBinding } from "@angular/core";
import { Subject } from 'rxjs';
import { ChatMessage, User } from '@banta/common';

@Component({
    selector: 'banta-comment',
    templateUrl: './comment.component.html',
    styleUrls: ['./comment.component.scss']
})
export class CommentComponent {
    private _reported = new Subject<void>();
    private _selected = new Subject<void>();
    private _upvoted = new Subject<void>();

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
    

    @Output()
    get upvoted() {
        return this._upvoted.asObservable();
    }

    @Output()
    get selected() {
        return this._selected.asObservable();
    }

    @HostBinding('attr.data-comment-id')
    get commentId() {
        return this.message?.id;
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
        if (user && user.avatarUrl) {
            let url = user.avatarUrl;
            return `url(${url})`;
        }

        return null;
    }

}