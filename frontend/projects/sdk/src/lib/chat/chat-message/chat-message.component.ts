import { Component, Input, Output } from "@angular/core";
import { User, ChatMessage } from '../../model';
import { Subject } from 'rxjs';

@Component({
    selector: 'engage-chat-message',
    templateUrl: './chat-message.component.html',
    styleUrls: ['./chat-message.component.scss']
})
export class ChatMessageComponent {
    private _selected = new Subject<void>();
    private _reported = new Subject<void>();
    private _upvoted = new Subject<void>();
    private _userSelected = new Subject<User>();

    @Input()
    message : ChatMessage;
    
    @Output() 
    get userSelected() {
        return this._userSelected;
    }

    @Output()
    get selected() {
        return this._selected;
    }

    @Output()
    get reported() {
        return this._reported;
    }

    @Output()
    get upvoted() {
        return this._upvoted;
    }

    avatarForUser(user : User) {
        if (user && user.avatarUrl) {
            let url = user.avatarUrl;
            return `url(${url})`;
        }

        return null;
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
    
    selectUser() {
        this._userSelected.next();
    }

}