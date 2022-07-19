import { Module } from "@alterior/di";
import { ChatOptions, ChatService } from "./chat.service";
import { LoggingModule } from "@alterior/logging";

@Module({
    imports: [
        LoggingModule
    ],
    providers: [
        ChatService
    ]
})
export class ChatModule {
}