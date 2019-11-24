import { NgModule } from '@angular/core';
import { EmojiSelectorPanelComponent } from './emoji-selector-panel/emoji-selector-panel.component';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../material.module';

const COMPONENTS = [
    EmojiSelectorPanelComponent
];

@NgModule({
    declarations: COMPONENTS,
    imports: [
        CommonModule,
        MaterialModule
    ],
    exports: COMPONENTS
})
export class EmojiModule {

}