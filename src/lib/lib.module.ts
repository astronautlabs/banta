import { NgModule } from '@angular/core';
import { CommentsModule } from './comments';
import { ChatModule } from './chat';
import { EmojiModule } from './emoji';
import { EngageComponent } from './engage/engage.component';
import { EngageLogoComponent } from './engage-logo.component';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../material.module';
import { FormsModule } from '@angular/forms';

const COMPONENTS = [
    EngageComponent,
    EngageLogoComponent
];

@NgModule({
    imports: [
        CommonModule,
        MaterialModule,
        FormsModule,
        CommentsModule,
        ChatModule,
        EmojiModule
    ],
    declarations: COMPONENTS,
    exports: COMPONENTS
})
export class LibModule {

}