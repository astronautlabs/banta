import { NgModule } from '@angular/core';
import { CommentsModule } from './comments';
import { ChatModule } from './chat';
import { EmojiModule } from './emoji';
import { EngageComponent } from './engage/engage.component';
import { EngageLogoComponent } from './engage-logo.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EngageCommonModule } from './common/common.module';
import { LiveMessageComponent } from './live-message.component';
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatMenuModule } from "@angular/material/menu";
import { MatDialogModule } from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";

const COMPONENTS = [
    EngageComponent,
    EngageLogoComponent,
    LiveMessageComponent
];

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        EngageCommonModule.forRoot(),
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
    declarations: COMPONENTS,
    exports: COMPONENTS
})
export class BantaSdkModule {

}