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
export class EngageCommonModule {
    static forRoot(): ModuleWithProviders<EngageCommonModule> {
        return {
            ngModule: EngageCommonModule,
            providers: [
                BantaService
            ]
        }
    }
}