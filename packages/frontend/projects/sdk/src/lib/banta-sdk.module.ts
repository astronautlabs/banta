import { NgModule } from '@angular/core';
import { BantaCommentsComponent, CommentsModule } from './comments';
import { BantaChatComponent, ChatModule } from './chat';
import { EmojiModule } from './emoji';
import { BantaComponent } from './banta/banta.component';
import { BantaLogoComponent } from './banta-logo.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BantaCommonModule } from './common/common.module';
import { LiveMessageComponent } from './live-message.component';
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatMenuModule } from "@angular/material/menu";
import { MatDialogModule } from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        BantaCommonModule.forRoot(),
        CommentsModule,
        ChatModule,
        EmojiModule,
        
        MatIconModule,
        MatButtonModule,
        MatTooltipModule,
        MatMenuModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule
    ],
    declarations: [
        BantaComponent,
        BantaLogoComponent,
        LiveMessageComponent
    ],
    exports: [
        BantaComponent,
        BantaLogoComponent,
        LiveMessageComponent,
        BantaChatComponent,
        BantaCommentsComponent
    ]
})
export class BantaSdkModule {

}