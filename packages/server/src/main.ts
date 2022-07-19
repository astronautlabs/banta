import "@alterior/platform-nodejs";
import { Application } from "@alterior/runtime";
import { WebService, Mount, Get, WebServerEngine } from "@alterior/web-server";
import { ExpressEngine } from '@alterior/express';

WebServerEngine.default = ExpressEngine;
import { CORSMiddleware } from "./cors";
import { ChatModule } from "./chat.module";
import { ChatController } from "./chat.controller";
import { AuthorizableAction, ChatService } from "./chat.service";
import { User } from "@banta/common";

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
        this.chat.authorizeAction = (user: User, token: string, action: AuthorizableAction) => {
            // if (action.action === 'editMessage')
            //     throw new Error(`You cannot edit your messages at this time.`);
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