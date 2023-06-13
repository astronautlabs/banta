import { NgModule, ModuleWithProviders } from '@angular/core';
import { TimestampComponent } from './timestamp.component';
import { CommonModule } from '@angular/common';
import { LightboxComponent } from './lightbox/lightbox.component';
import { MatIconModule } from '@angular/material/icon';
import { BantaMarkdownToHtmlPipe } from './markdown-to-html.pipe';
import { BantaAttachmentsComponent } from './attachments/attachments.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { BantaTrustResourceUrlPipe } from './trust-resource-url.pipe';
import { BantaAttachmentComponent } from './attachment/attachment.component';
import { BantaMentionLinkerPipe } from './mention-linker.pipe';
import { TimerPool } from './timer-pool.service';

const COMPONENTS = [
    TimestampComponent,
    LightboxComponent,
    BantaMarkdownToHtmlPipe,
    BantaMentionLinkerPipe,
    BantaTrustResourceUrlPipe,
    BantaAttachmentComponent,
    BantaAttachmentsComponent
];

@NgModule({
    declarations: COMPONENTS,
    imports: [
        CommonModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MatButtonModule
    ],
    exports: COMPONENTS
})
export class BantaCommonModule {
    static forRoot(): ModuleWithProviders<BantaCommonModule> {
        return {
            ngModule: BantaCommonModule,
            providers: [
                TimerPool
            ]
        }
    }
}