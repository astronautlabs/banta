import { NgModule } from '@angular/core';
import { SignInDialogComponent } from './sign-in-dialog/sign-in-dialog.component';
import { MaterialModule } from 'src/material.module';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@NgModule({
    declarations: [
        SignInDialogComponent
    ],
    entryComponents: [
        SignInDialogComponent
    ],
    imports: [
        CommonModule,
        FormsModule,
        MaterialModule
    ],
    exports: [
        SignInDialogComponent
    ]
})
export class AccountsModule {
}