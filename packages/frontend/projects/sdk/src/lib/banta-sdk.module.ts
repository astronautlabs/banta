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
import { MatSnackBarModule } from "@angular/material/snack-bar";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { ChatBackend } from './chat-backend';
import { SdkOptions } from './sdk-options';
import { BANTA_SDK_OPTIONS } from './sdk-options';
import { ChatBackendBase } from './chat-backend-base';
import { OverlayModule } from '@angular/cdk/overlay';
import { PortalModule } from '@angular/cdk/portal';
import { UrlAttachmentResolver, UrlAttachmentScraper } from './url-attachments';
import { YouTubeAttachmentResolver } from './youtube-attachments';
import { GiphyAttachmentResolver } from './giphy-attachments';
import { TweetAttachmentResolver } from './tweet-attachments';

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
        MatInputModule,
        MatProgressSpinnerModule,
        MatSnackBarModule,
        OverlayModule,
        PortalModule
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
        BantaCommonModule,
        ChatModule,
        CommentsModule,
        EmojiModule
    ]
})
export class BantaSdkModule {
    constructor(
        chatBackend: ChatBackendBase
    ) {
        if (typeof window !== 'undefined') {
            if (!document.querySelector('script[src="https://platform.twitter.com/widgets.js"]')) {
                let script = document.createElement('script');
                script.src = 'https://platform.twitter.com/widgets.js';
                script.async = true;
                document.body.appendChild(script);
            }
        }

        chatBackend.registerAttachmentScraper(new UrlAttachmentScraper());
        chatBackend.registerAttachmentResolver(new GiphyAttachmentResolver());
        chatBackend.registerAttachmentResolver(new YouTubeAttachmentResolver());
        chatBackend.registerAttachmentResolver(new TweetAttachmentResolver());
        chatBackend.registerAttachmentResolver(new UrlAttachmentResolver(chatBackend));
    }
    
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