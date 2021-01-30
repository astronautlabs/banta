import { Component, OnInit, Input } from '@angular/core';
import { Feature, Sku } from '../feature';

@Component({
  selector: 'saas-features-grid',
  templateUrl: './features-grid.component.html',
  styleUrls: ['./features-grid.component.scss']
})
export class FeaturesGridComponent {

  @Input()
  features : Feature[];

  @Input()
  skus : Sku[];
}
