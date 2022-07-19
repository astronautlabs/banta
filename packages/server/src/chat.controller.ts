import { Controller, Get, WebServer } from "@alterior/web-server";
import { ChatService } from "./chat.service";
import * as bodyParser from 'body-parser';
import { HttpError } from "@alterior/common";
import type * as express from 'express';
import { ChatConnection } from "./chat-connection";
import * as mongodb from 'mongodb';

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
        new ChatConnection(this.chat)
            .bind(await WebServer.startSocket());
    }
}