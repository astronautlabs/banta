import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { User } from '@banta/common';

@Injectable()
export class BantaService {
    private _userChanged = new BehaviorSubject<User>(null);
    private _user : User;
    
    get userChanged() : Observable<User> {
        return this._userChanged;
    }
    
    set user(user : User) {
        this._user = user;
        this._userChanged.next(user);
    }

    get user() {
        return this._user;
    }
}