import { NgModule } from '@angular/core';
import { TimestampComponent } from './timestamp.component';
import { CommonModule } from '@angular/common';
import { LightboxComponent } from './lightbox/lightbox.component';
import { MatIconModule } from '@angular/material/icon';

const COMPONENTS = [
    TimestampComponent,
    LightboxComponent
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