import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';

@Injectable()
export class AccountsService {
    constructor(
        private matDialog : MatDialog
    ) {

    }

    signInDialogComponent : any;
    signUpDialogComponent : any;

    showSignIn() {
        this.matDialog.open(this.signInDialogComponent);
    }

    showSignUp() {
        this.matDialog.open(this.signUpDialogComponent);
    }
}