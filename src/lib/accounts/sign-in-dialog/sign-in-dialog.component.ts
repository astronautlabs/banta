import { Component, Output, Optional } from '@angular/core';
import { ChatBackendService } from 'src/lib/model';
import { MatDialogRef, MatDialog } from '@angular/material/dialog';
import { AccountsService } from '../accounts.service';
import { Observable, Subject } from 'rxjs';

@Component({
    selector: 'engage-sign-in',
    templateUrl: './sign-in-dialog.component.html',
    styleUrls: [`./sign-in-dialog.component.scss`]
})
export class SignInDialogComponent {
    constructor(
        private accountsService : AccountsService,
        private backend : ChatBackendService,
        @Optional()
        private dialogRef : MatDialogRef<SignInDialogComponent>
    ) {
    }

    email : string;
    password : string;

    errorMessage : string = null;

    private _selectSignUp = new Subject<void>();
    private _closed = new Subject<void>();
    
    @Output()
    get closed(): Observable<void> {
        return this._closed;
    }
    @Output()
    get selectSignUp(): Observable<void> {
        return this._selectSignUp;
    }
    
    showSignUp() {
        if (this.dialogRef) {
            this.dialogRef.close();
            this.accountsService.showSignUp();
        } else {
            this._selectSignUp.next();
        }
    }

    async submit() {
        try {
            await this.backend.signInWithPassword(this.email, this.password);
        } catch (e) {
            console.error(`Caught error while trying to sign in:`);
            console.dir(e);

            let message = e.message;

            if (e.code === 'auth/wrong-password') {
                message = 'Incorrect email address or password';
            }

            this.errorMessage = message;
            return;
        }

        this.close();
    }

    close() {
        if (this.dialogRef)
            this.dialogRef.close();
        else
            this._closed.next();
    }
}