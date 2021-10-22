import { NgModule } from '@angular/core';
import { EmojiSelectorPanelComponent } from './emoji-selector-panel/emoji-selector-panel.component';
import { CommonModule } from '@angular/common';
import { EmojiSelectorButtonComponent } from './emoji-selector-button.component';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';

const COMPONENTS = [
    EmojiSelectorPanelComponent,
    EmojiSelectorButtonComponent
];

@NgModule({
    declarations: COMPONENTS,
    imports: [
        CommonModule,
        FormsModule,
        MatIconModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule
    ],
    exports: COMPONENTS
})
export class EmojiModule {

}