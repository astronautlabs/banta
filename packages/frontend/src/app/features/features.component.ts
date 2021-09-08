import { Component } from '@angular/core';
import { SKUS, FEATURES } from '../content';

@Component({
    templateUrl: './features.component.html',
    styleUrls: ['./features.component.scss']
})
export class FeaturesComponent {
    skus = SKUS;
    features = FEATURES;
}