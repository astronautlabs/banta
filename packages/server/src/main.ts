import "@alterior/platform-nodejs";
import { Application } from "@alterior/runtime";
import { WebService, Mount, Get, WebServerEngine, WebEvent, WebServer } from "@alterior/web-server";
import { ExpressEngine } from '@alterior/express';

WebServerEngine.default = ExpressEngine;
import { CORSMiddleware } from "./cors";
import { ChatModule } from "./chat.module";
import { ChatController } from "./chat.controller";
import { AuthorizableAction, ChatService, simpleMentionExtractor } from "./chat.service";
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

                console.log(`[!!] Demo authentication for token '${token}', user '${user.username}'`);
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