import "@alterior/platform-nodejs";
import { Application } from "@alterior/runtime";
import { WebService, Mount, Get, WebServerEngine } from "@alterior/web-server";
import { ExpressEngine } from '@alterior/express';

WebServerEngine.default = ExpressEngine;
import { CORSMiddleware } from "./cors";
import { ChatModule } from "./chat.module";
import { ChatController } from "./chat.controller";

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
    @Mount() banta : ChatController;

    @Get('/healthz')
    healthz() {
        return { message: 'Healthy' };
    }
}

Application.bootstrap(BantaService);