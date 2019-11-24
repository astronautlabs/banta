import { NgModule } from "@angular/core";
import { ChatMessageComponent } from './chat-message/chat-message.component';
import { ChatViewComponent } from './chat-view/chat-view.component';
import { FirehoseChatComponent } from './firehose-chat/firehose-chat.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from '../../material.module';
import { EmojiModule } from '../emoji';

const COMPONENTS = [
    ChatMessageComponent,
    ChatViewComponent,
    FirehoseChatComponent
];

@NgModule({
    declarations: COMPONENTS,
    imports: [
        CommonModule,
        FormsModule,
        MaterialModule,
        EmojiModule
    ],
    exports: COMPONENTS
})
export class ChatModule {
}