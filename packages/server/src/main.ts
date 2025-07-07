import "@alterior/platform-nodejs";
import { Application } from "@alterior/runtime";
import { WebService, Mount, Get, WebServerEngine, WebEvent, WebServer } from "@alterior/web-server";
import { ExpressEngine } from '@alterior/express';
import { CORSMiddleware } from "./cors";
import { ChatModule } from "./chat.module";
import { ChatController } from "./chat.controller";
import { AuthorizableAction, ChatService, simpleMentionExtractor } from "./chat.service";
import { User } from "@banta/common";
import { Logger, LoggingModule } from "@alterior/logging";
import { inject } from "@alterior/di";

WebServerEngine.default = ExpressEngine;

globalThis.fetch = require('node-fetch');

/**
 * An example server implementation for Banta. 
 * It's expected that the integrator implement their own web service class, you can 
 * start from this one as an example.
 */
@WebService({
    server: {
        port: Number(process.env.BANTA_PORT || 3422),
        middleware: [ CORSMiddleware ],
        requestReporterFilters: [
            (event, source) => {
                if (event.request['path'] === '/socket')
                    return false;

                return true;
            }
        ],
    },
    silent: true,
    imports: [
        ChatModule,
        LoggingModule.configure({
            listeners: [ ChatModule.CONSOLE_LOGGER ]
        })
    ]
})
class BantaService {
    readonly chat = inject(ChatService);
    readonly logger = inject(Logger);

    altOnInit() {
        // this.chat.transformMessage = async (message: ChatMessage, action: 'post' | 'edit', previousMessage: string) => {
        //     message.message = message.message.toUpperCase();
        // }

        this.chat.validateToken = async (token: string) => {
            if (token === 'bantabot') {
                return {
                    id: 'bantabot',
                    displayName: 'bantabot',
                    username: 'bantabot',
                    tag: 'Bot'
                }
            }
            if (process.env.IS_DEMO) {
                const usersByToken = {
                    abc123: {
                        id: 'abc',
                        displayName: 'Bob',
                        username: 'bob',
                        tag: 'El Heffe'
                    },
                    def321: {
                        id: 'def',
                        username: 'alice',
                        displayName: 'Alice',
                        avatarUrl: `https://gravatar.com/avatar/${Date.now().toString(16)}?s=512&d=robohash`,
                        token: 'def321'
                      }
                }

                const user = usersByToken[token];

                if (!user) {
                    throw new Error(`Not a valid token`);
                }

                this.logger.warning(`Demo authentication for token '${token}', user '${user.username}'`);
                
                return user;
            }
            throw new Error(`The Banta integration must specify validateToken()`);
        };

        this.chat.extractMentions = simpleMentionExtractor(un => `/@${un}`);
        this.chat.authorizeAction = (user: User, token: string, action: AuthorizableAction) => {
            // if (action.action === 'likeMessage') {
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