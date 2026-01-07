import { Component, OnInit, Input } from '@angular/core';
import { Feature, Sku } from '../feature';

@Component({
    selector: 'saas-pricing-grid',
    templateUrl: './pricing-grid.component.html',
    styleUrls: ['./pricing-grid.component.scss'],
    standalone: false
})
export class PricingGridComponent {

  @Input()
  features : Feature[];

  @Input()
  skus : Sku[];

  skuSupportsFeature(feature : Feature, sku : string) {
    return feature.skus.includes(sku);
  }
}
