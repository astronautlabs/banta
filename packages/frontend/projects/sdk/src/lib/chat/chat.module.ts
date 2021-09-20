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

@NgModule({
    declarations: [
        ChatMessageComponent,
        LiveChatMessageComponent,
        ChatViewComponent,
        BantaChatComponent
    ],
    imports: [
        CommonModule,
        FormsModule,
        MatIconModule,
        MatButtonModule,
        EmojiModule
    ],
    exports: [
        BantaChatComponent
    ]
})
export class ChatModule {
}