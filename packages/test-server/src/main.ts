import "@alterior/platform-nodejs";
import { Application } from "@alterior/runtime";
import { WebService, Mount, Get, WebServerEngine } from "@alterior/web-server";
import { ChatController, ChatModule } from "@banta/server";
import { ExpressEngine } from '@alterior/express';

WebServerEngine.default = ExpressEngine;
import { CORSMiddleware } from "./cors";

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
class ExampleService {
    @Mount() banta : ChatController;

    @Get('/healthz')
    healthz() {
        return { message: 'Healthy' };
    }
}

Application.bootstrap(ExampleService);