import { NgModule } from '@angular/core';
import { EmojiSelectorPanelComponent } from './emoji-selector-panel/emoji-selector-panel.component';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../material.module';
import { EmojiSelectorButtonComponent } from './emoji-selector-button.component';

const COMPONENTS = [
    EmojiSelectorPanelComponent,
    EmojiSelectorButtonComponent
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