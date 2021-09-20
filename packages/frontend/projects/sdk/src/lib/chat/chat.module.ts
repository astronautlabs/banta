import { NgModule } from "@angular/core";
import { ChatMessageComponent } from './chat-message/chat-message.component';
import { ChatViewComponent } from './chat-view/chat-view.component';
import { BantaChatComponent } from './banta-chat/banta-chat.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmojiModule } from '../emoji';
import { LiveChatMessageComponent } from './live-chat-message.component';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

const COMPONENTS = [
    ChatMessageComponent,
    LiveChatMessageComponent,
    ChatViewComponent,
    BantaChatComponent
];

@NgModule({
    declarations: COMPONENTS,
    imports: [
        CommonModule,
        FormsModule,
        MatIconModule,
        MatButtonModule,
        EmojiModule
    ],
    exports: COMPONENTS
})
export class ChatModule {
}