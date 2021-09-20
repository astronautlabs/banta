import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { UserAccount } from '@banta/common';

@Injectable()
export class BantaService {
    private _userChanged = new BehaviorSubject<UserAccount>(null);
    private _user : UserAccount;
    
    get userChanged() : Observable<UserAccount> {
        return this._userChanged;
    }
    
    set user(user : UserAccount) {
        this._user = user;
        this._userChanged.next(user);
    }

    get user() {
        return this._user;
    }
}