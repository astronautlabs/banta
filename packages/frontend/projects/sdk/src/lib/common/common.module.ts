import { ModuleWithProviders, NgModule } from '@angular/core';
import { TimestampComponent } from './timestamp.component';
import { CommonModule } from '@angular/common';
import { BantaService } from './banta.service';

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
    static forRoot(): ModuleWithProviders<BantaCommonModule> {
        return {
            ngModule: BantaCommonModule,
            providers: [
                BantaService
            ]
        }
    }
}