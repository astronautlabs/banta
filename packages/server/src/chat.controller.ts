import { Body, Controller, Get, Post, WebEvent, WebServer } from "@alterior/web-server";
import { ChatService } from "./chat.service";
import * as bodyParser from 'body-parser';
import { HttpError } from "@alterior/common";
import type * as express from 'express';
import { ChatConnection } from "./chat-connection";
import * as mongodb from 'mongodb';
import { Logger } from "@alterior/logging";

export interface SignInRequest {
    email : string;
    password : string;
}

@Controller('', {
    middleware: [ bodyParser.json() ]
})
export class ChatController {
    constructor(
        private chat : ChatService
    ) {
    }

    @Get('/socket')
    async socket() {
        let conn = new ChatConnection(
            this.chat, 
            (WebEvent.request as express.Request).ip,
            (WebEvent.request as express.Request).header('user-agent')
        );

        conn.bind(await WebServer.startSocket());
    }

    @Get('/topics/:id')
    async getTopic(id: string) {
        let topic = await this.chat.getTopic(id, false);
        if (!topic)
            throw new HttpError(404, { error: `not-found` });

        return topic;
    }

    @Post('/urls')
    async getUrlCard(@Body() body: { url: string }) {
        let url = body.url;
        console.log(`finding url card for '${url}'`);
        try {
            let card = await this.chat.getUrlCard(url);

            if (card)
                return card;
            
            return new HttpError(404, { code: 'not-found', message: 'No card available for this URL' });
        } catch (e) {
            Logger.current.error(`Failed to retrieve URL card for '${url}': ${e.message}`);
            Logger.current.error(`Returning null.`);
            return null;
        }
    }
}