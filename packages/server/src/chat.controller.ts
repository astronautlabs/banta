import { Body, Controller, Get, Post, QueryParam, WebEvent, WebServer } from "@alterior/web-server";
import { Cache } from "@alterior/common";
import { ChatService } from "./chat.service";
import * as bodyParser from 'body-parser';
import { HttpError } from "@alterior/common";
import type * as express from 'express';
import { ChatConnection } from "./chat-connection";
import { Logger } from "@alterior/logging";
import { v4 as uuid } from "uuid";
import { CommentsOrder, FilterMode, UrlCard, Topic, ChatMessage } from "@banta/common";
import * as os from 'os';

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

    runId = uuid();
    serverId = os.hostname();

    @Get('/stats')
    async info() {
        return { 
            service: `@banta/server`,
            serverId: this.serverId,
            runId: this.runId,
            connections: this.chat.activeConnections
        };
    }

    @Get('/socket')
    async socket() {
        if (!WebEvent.request.headers.upgrade) {
            throw new HttpError(400, {
                message: `This endpoint is used for Banta's WebSocket connection (must send Upgrade header)`
            });
        }

        let conn = new ChatConnection(
            this.chat, 
            (WebEvent.request as express.Request).ip,
            (WebEvent.request as express.Request).header('user-agent')
        );

        conn.bind(await WebServer.startSocket());
    }

    private topicsCache = new Cache<Topic>(1000 * 60 * 15, 5000);

    @Get('/topics/:id')
    async getTopic(id: string): Promise<Topic> {
        let topic: Topic;

        try {
            topic = await this.topicsCache.fetch(id, () => this.chat.getTopic(id, false));
        } catch (e) {
            let errorId = uuid();
            Logger.current.error(`Error occurred while getting topic information: ${e.message}. Stack: ${e.stack}. Error ID: ${errorId}`);
            throw new HttpError(500, { message: 'An internal error occurred', errorId })
        }

        if (!topic) {
            return {
                id,
                createdAt: 0,
                messageCount: 0
            };
        }

        return topic;
    }

    @Get('/topics/:id/messages')
    async getMessages(
        id: string, 
        @QueryParam() sort: CommentsOrder, 
        @QueryParam() filter: FilterMode, 
        @QueryParam() offset: number, 
        @QueryParam() limit: number
    ): Promise<ChatMessage[]> {
        sort ??= CommentsOrder.NEWEST;
        filter ??= FilterMode.ALL;
        offset ??= 0;
        limit ??= 20;

        if (limit < 0 || offset < 0)
            throw new HttpError(400, { error: "invalid-request", message: "offset/limit cannot be negative" });

        if (limit > 1000)
            throw new HttpError(400, { error: "invalid-request", message: "max limit is 1000" });

        if (filter == FilterMode.MINE || filter == FilterMode.MY_LIKES)
            throw new HttpError(400, { error: "invalid-request", message: "personalized filters are not supported" });

        return await this.chat.getMessages({
            topicId: id, 
            sort,
            filter,
            offset,
            limit
        })
    }

    @Get('/messages/:id')
    async getMessage(id: string) {
        return await this.chat.getMessage(id);
    }

    @Get('/messages/:id/replies')
    async getReplies(
        id: string, 
        @QueryParam() sort: CommentsOrder, 
        @QueryParam() filter: FilterMode, 
        @QueryParam() offset: number, 
        @QueryParam() limit: number
    ): Promise<ChatMessage[]> {
        sort ??= CommentsOrder.NEWEST;
        filter ??= FilterMode.ALL;
        offset ??= 0;
        limit ??= 20;
        
        let message = await this.chat.getMessage(id);

        if (!message)
            throw new HttpError(404, { error: 'not-found' });

        return this.chat.getMessages({ topicId: message.topicId, parentMessageId: id, sort, filter, offset, limit });
    }

    private urlCardsCache = new Cache<UrlCard>(1000 * 60 * 15, 5000);

    @Post('/urls')
    async getUrlCard(@Body() body: { url: string }) {
        let url = body.url;
        console.log(`finding url card for '${url}'`);
        let card: UrlCard;

        try {
            card = await this.urlCardsCache.fetch(url, () => this.chat.getUrlCard(url));
        } catch (e) {
            Logger.current.error(`Failed to retrieve URL card for '${url}': ${e.message}`);
            Logger.current.error(`Returning null.`);
            return null;
        }

        if (!card)
            return new HttpError(404, { code: 'not-found', message: 'No card available for this URL' });

        return card;
    }
}