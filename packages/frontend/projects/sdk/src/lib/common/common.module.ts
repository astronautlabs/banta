import { NgModule } from '@angular/core';
import { TimestampComponent } from './timestamp.component';
import { CommonModule } from '@angular/common';
import { LightboxComponent } from './lightbox/lightbox.component';
import { MatIconModule } from '@angular/material/icon';
import { BantaMarkdownToHtmlPipe } from './markdown-to-html.pipe';

const COMPONENTS = [
    TimestampComponent,
    LightboxComponent,
    BantaMarkdownToHtmlPipe
];

@NgModule({
    declarations: COMPONENTS,
    imports: [
        CommonModule,
        MatIconModule
    ],
    exports: COMPONENTS
})
export class BantaCommonModule {
}