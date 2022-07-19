import { ModuleWithProviders, NgModule } from '@angular/core';
import { CommentsModule } from './comments';
import { ChatModule } from './chat';
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
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { ChatBackend } from './chat-backend';
import { SdkOptions } from './sdk-options';
import { BANTA_SDK_OPTIONS } from './sdk-options';
import { ChatBackendBase } from './chat-backend-base';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        BantaCommonModule,
        CommentsModule,
        ChatModule,
        EmojiModule,
        
        MatIconModule,
        MatButtonModule,
        MatTooltipModule,
        MatMenuModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatProgressSpinnerModule
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
        ChatModule,
        CommentsModule
    ]
})
export class BantaSdkModule {
    static configure(options?: SdkOptions): ModuleWithProviders<BantaSdkModule> {
        return {
            ngModule: BantaSdkModule,
            providers: [
                { 
                    provide: BANTA_SDK_OPTIONS, 
                    useValue: options || {}
                },
                { provide: ChatBackendBase, useClass: ChatBackend }
            ]
        }
    }
}