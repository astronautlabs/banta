import { NgModule } from '@angular/core';
import { SignInDialogComponent } from './sign-in-dialog/sign-in-dialog.component';
import { MaterialModule } from 'src/material.module';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AccountsService } from './accounts.service';
import { SignUpDialogComponent } from './sign-up-dialog/sign-up-dialog.component';

@NgModule({
    declarations: [
        SignInDialogComponent,
        SignUpDialogComponent
    ],
    entryComponents: [
        SignInDialogComponent,
        SignUpDialogComponent
    ],
    providers: [
        AccountsService
    ],
    imports: [
        CommonModule,
        FormsModule,
        MaterialModule
    ],
    exports: [
        SignInDialogComponent,
        SignUpDialogComponent
    ]
})
export class AccountsModule {
    constructor(
        accountsService : AccountsService
    ) {
        accountsService.signInDialogComponent = SignInDialogComponent;
        accountsService.signUpDialogComponent = SignUpDialogComponent;
    }
}