import { Module } from "@alterior/di";
import { ChatController } from "./chat.controller";
import { ChatService } from "./chat.service";
import { LoggingModule } from "@alterior/logging";

@Module({
    imports: [
        LoggingModule
    ],
    providers: [
        ChatService
    ],
    controllers: [ ChatController ]
})
export class ChatModule {
}