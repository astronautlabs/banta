import { NgModule } from '@angular/core';
import { CommentsModule } from './comments';
import { ChatModule } from './chat';
import { EmojiModule } from './emoji';
import { EngageComponent } from './engage/engage.component';
import { EngageLogoComponent } from './engage-logo.component';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../material.module';
import { FormsModule } from '@angular/forms';
import { AccountsModule } from './accounts';
import { EngageCommonModule } from './common/common.module';
import { LiveMessageComponent } from './live-message.component';

const COMPONENTS = [
    EngageComponent,
    EngageLogoComponent,
    LiveMessageComponent
];

@NgModule({
    imports: [
        CommonModule,
        MaterialModule,
        FormsModule,
        EngageCommonModule,
        AccountsModule,
        CommentsModule,
        ChatModule,
        EmojiModule
    ],
    declarations: COMPONENTS,
    exports: COMPONENTS
})
export class LibModule {

}