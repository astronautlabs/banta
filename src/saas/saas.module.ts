import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FeaturesGridComponent } from './features-grid/features-grid.component';
import { PricingGridComponent } from './pricing-grid/pricing-grid.component';
import { MaterialModule } from 'src/material.module';

const COMPONENTS = [
    PricingGridComponent,
    FeaturesGridComponent
];

@NgModule({
    imports: [
        CommonModule,
        MaterialModule
    ],
    declarations: COMPONENTS,
    exports: COMPONENTS
})
export class SaasModule {
}