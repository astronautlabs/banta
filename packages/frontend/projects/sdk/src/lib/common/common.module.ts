import { NgModule } from '@angular/core';
import { TimestampComponent } from './timestamp.component';
import { CommonModule } from '@angular/common';

const COMPONENTS = [
    TimestampComponent
];

@NgModule({
    declarations: COMPONENTS,
    imports: [
        CommonModule
    ],
    exports: COMPONENTS
})
export class BantaCommonModule {
}