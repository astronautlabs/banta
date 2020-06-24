import { Component } from '@angular/core';
import { Sku, Feature } from 'src/saas/feature';
import { SKUS, FEATURES } from '../content';

@Component({
    templateUrl: './pricing.component.html',
    styleUrls: ['./pricing.component.scss']
})
export class PricingComponent {
    skus = SKUS;
    features = FEATURES;
}