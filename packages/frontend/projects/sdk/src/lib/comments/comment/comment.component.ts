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
	private _avatarClicked = new Subject<User>();
	private _usernameClicked = new Subject<User>();
    
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
        return this._userSelected;
    }

    @Output()
    get usernameClicked() {
        return this._usernameClicked;
    }

	@Output()
	get avatarClicked() {
		return this._avatarClicked;
	}

    @Output()
    get reported() {
        return this._reported;
    }
    
    @Output()
    get upvoted() {
        return this._upvoted;
    }

    @Output()
    get selected() {
        return this._selected;
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
        return this._userSelected.next();
    }

    usernameClick(user: User) {
        return this._usernameClicked.next(user);
    }

	avatarClick(user: User) {
		return this._avatarClicked.next(user);
	}
    
    avatarForUser(user : User) {
        if (user && user.avatarUrl) {
            let url = user.avatarUrl;
            return `url(${url})`;
        }

        return null;
    }

}