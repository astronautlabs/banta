import { Component, Optional, Output } from '@angular/core';
import { ChatBackendService } from 'src/lib/model';
import { MatDialogRef, MatDialog } from '@angular/material/dialog';
import { AccountsService } from '../accounts.service';
import { Subject, Observable } from 'rxjs';

@Component({
    selector: 'engage-sign-up',
    templateUrl: './sign-up-dialog.component.html',
    styleUrls: [`./sign-up-dialog.component.scss`]
})
export class SignUpDialogComponent {
    constructor(
        private accountsService : AccountsService,
        private backend : ChatBackendService,

        @Optional()
        private dialogRef : MatDialogRef<SignUpDialogComponent>
    ) {
    }

    email : string;
    password : string;
    password2 : string;
    username : string;
    displayName : string;

    errorMessage : string = null;

    private _selectSignIn = new Subject<void>();
    private _closed = new Subject<void>();
    
    @Output()
    get closed(): Observable<void> {
        return this._closed;
    }
    @Output()
    get selectSignIn(): Observable<void> {
        return this._selectSignIn;
    }

    showSignIn() {
        if (this.dialogRef) {
            this.dialogRef.close();
            this.accountsService.showSignIn();
        } else {
            this._selectSignIn.next();
        }
    }

    async submit() {

        if (!this.email) {
            this.errorMessage = `You must enter your email address to continue.`;
            return;
        }

        if (this.email.endsWith('.con') || this.email.endsWith('.comm') || this.email.endsWith('.comn')) {
            this.errorMessage = `Invalid email: Did you mean .com?`;
            return;
        }

        if (this.email.endsWith('gmail.co') || this.email.endsWith('gmail')) {
            this.errorMessage = `Invalid email: Did you mean gmail.com?`;
            return;
        }

        if (this.email.endsWith('yahoo.co') || this.email.endsWith('yahoo')) {
            this.errorMessage = `Invalid email: Did you mean yahoo.com?`;
            return;
        }

        if (this.email.endsWith('hotmail.co') || this.email.endsWith('hotmail')) {
            this.errorMessage = `Invalid email: Did you mean hotmail.com?`;
            return;
        }

        if (!this.email.includes('@')) {
            this.errorMessage = `Invalid email: Must include @`;
            return;
        }

        if (!/@[A-Za-z0-9]+(\.[A-Za-z0-9]+){1,}/.test(this.email)) {
            this.errorMessage = `Invalid email: Please check your input and try again`;
            return;
        }

        if (!this.password) {
            this.errorMessage = `You must choose a password.`;
            return;
        }

        if (!this.displayName) {
            this.errorMessage = `Please enter a display name. This will be visible to other users.`;
            return;
        }

        if (!this.username) {
            this.errorMessage = `Please enter a username. Other users will type this to mention you.`;
            return;
        }

        if (this.password !== this.password2) {
            this.errorMessage = `Passwords do not match.`;
            return;
        }

        try {
            await this.backend.signUp({
                email: this.email, 
                password: this.password,
                displayName: this.displayName,
                username: this.username
            });
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