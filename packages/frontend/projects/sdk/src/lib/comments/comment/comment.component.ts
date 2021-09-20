import { Component, Output, Input } from "@angular/core";
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
    
    @Input()
    message : ChatMessage;

    @Input()
    showReplyAction = true;

    @Output()
    get userSelected() {
        return this._userSelected;
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
    
    avatarForUser(user : User) {
        if (user && user.avatarUrl) {
            let url = user.avatarUrl;
            return `url(${url})`;
        }

        return null;
    }
}