import { Component, OnInit, Input } from '@angular/core';
import { Feature, Sku } from '../feature';

@Component({
    selector: 'saas-features-grid',
    templateUrl: './features-grid.component.html',
    styleUrls: ['./features-grid.component.scss'],
    standalone: false
})
export class FeaturesGridComponent {

  @Input()
  features : Feature[];

  @Input()
  skus : Sku[];
}
