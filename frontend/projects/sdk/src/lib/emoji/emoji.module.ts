import { NgModule } from '@angular/core';
import { EmojiSelectorPanelComponent } from './emoji-selector-panel/emoji-selector-panel.component';
import { CommonModule } from '@angular/common';
import { EmojiSelectorButtonComponent } from './emoji-selector-button.component';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

const COMPONENTS = [
    EmojiSelectorPanelComponent,
    EmojiSelectorButtonComponent
];

@NgModule({
    declarations: COMPONENTS,
    imports: [
        CommonModule,
        MatIconModule,
        MatButtonModule
    ],
    exports: COMPONENTS
})
export class EmojiModule {

}