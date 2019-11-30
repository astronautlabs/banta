import { Component } from '@angular/core';
import { ChatBackendService } from 'src/lib/model';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
    templateUrl: './sign-in-dialog.component.html',
    styleUrls: [`./sign-in-dialog.component.scss`]
})
export class SignInDialogComponent {
    constructor(
        private backend : ChatBackendService,
        private dialogRef : MatDialogRef<SignInDialogComponent>
    ) {

    }

    email : string;
    password : string;

    errorMessage : string = null;

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
        this.dialogRef.close();
    }
}