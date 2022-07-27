import "@alterior/platform-nodejs";
import { Application } from "@alterior/runtime";
import { WebService, Mount, Get, WebServerEngine, WebEvent, WebServer } from "@alterior/web-server";
import { ExpressEngine } from '@alterior/express';

WebServerEngine.default = ExpressEngine;
import { CORSMiddleware } from "./cors";
import { ChatModule } from "./chat.module";
import { ChatController } from "./chat.controller";
import { AuthorizableAction, ChatService } from "./chat.service";
import { ChatMessage, User } from "@banta/common";

globalThis.fetch = require('node-fetch');

@WebService({
    server: {
        port: 3422,
        middleware: [ CORSMiddleware ]
    },
    imports: [
        ChatModule
    ]
})
class BantaService {
    constructor(
        readonly chat: ChatService
    ) {
    }

    altOnInit() {
        this.chat.transformMessage = async (message: ChatMessage, action: 'post' | 'edit', previousMessage: string) => {
            message.message = message.message.toUpperCase();
        }

        this.chat.authorizeAction = (user: User, token: string, action: AuthorizableAction) => {
            // if (action.action === 'postMessage') {
            //     if (action.precheck)
            //         throw new Error(`You have to sign the petition first`);
            //     else
            //         throw new Error(`app-handle|stuff`);
            // }

            // if (action.action === 'postMessage' && action.message)
            //     throw new Error(`You cannot post THIS message at this time.`);
            //throw new Error('Not allowed');
        };
    }

    @Mount() banta : ChatController;

    @Get('/healthz')
    healthz() {
        return { message: 'Healthy' };
    }
}

Application.bootstrap(BantaService);