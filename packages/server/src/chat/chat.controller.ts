import { Controller, Post, Body, WebEvent, PathParam, Response, Patch } from "@alterior/web-server";
import { ChatMessage, User } from "@banta/common";
import { AccountsService } from "../accounts";
import { ChatService } from "./chat.service";
import * as bodyParser from 'body-parser';
import { HttpError } from "@alterior/common";
import type * as express from 'express';

export interface SignInRequest {
    email : string;
    password : string;
}

@Controller('', {
    middleware: [ bodyParser.json() ]
})
export class ChatController {
    constructor(
        private accounts : AccountsService,
        private chatService : ChatService
    ) {
    }

    async getAuthorizedUser(): Promise<User> {
        let authorization = WebEvent.current.request.headers.authorization;

        if (authorization && /^bearer .*/i.test(authorization)) {
            let tokenStr = authorization.replace(/^bearer /i, '');
            let user = await this.accounts.validateToken(tokenStr);
            if (user)
                return user;
        }

        throw new HttpError(401, { message: 'Unauthorized' });
    }

    @Post(`/topics/:topicID/messages`)
    async post(
        @PathParam('topicID') topicID : string, 
        @Body() message : ChatMessage
    ) {
        let authorizedUser = await this.getAuthorizedUser();

        message.user = authorizedUser;
        message.topicId = topicID;

        try {
            message = await this.chatService.post(message);
        } catch (e) {
            console.error(`Failed to post message to ${topicID}: ${e.message} [code=${e.code}]`);
            return Response.badRequest({ message: e.message, code: e.code });
        }
        
        return message;
    }

    @Post(`/topics/:topicID/messages/:messageID/messages`)
    async subPost(
        @PathParam('topicID') topicID : string, 
        @PathParam('messageID') messageID : string, 
        @Body() message : ChatMessage
    ) {
        let authorizedUser = await this.getAuthorizedUser();

        message.user = authorizedUser;
        message.topicId = topicID;

        try {
            message = await this.chatService.postSubMessage(topicID, messageID, message);
        } catch (e) {
            console.error(`Failed to post sub-message to ${topicID}/${messageID}: ${e.message} [code=${e.code}]`);
            return Response.badRequest({ message: e.message, code: e.code });
        }

        return message;
    }

    @Post(`/topics/:topicID/messages/:messageID/upvote`)
    async upvoteMessage(
        @PathParam('topicID') topicID : string, 
        @PathParam('messageID') messageID : string
    ) {
        let authorizedUser = await this.getAuthorizedUser();

        let message = await this.chatService.getMessage(topicID, messageID);

        await this.chatService.upvote(message, { 
            id: authorizedUser.id,
            user: authorizedUser,
            createdAt: Date.now(),
            ipAddress: (WebEvent.request as express.Request).ip
        });

        return { code: 'success', message: 'Success' };
    }

    @Post(`/topics/:topicID/messages/:parentMessageID/messages/:messageID/upvote`)
    async upvoteSubMessage(
        @PathParam('topicID') topicID : string, 
        @PathParam('parentMessageID') parentMessageID : string, 
        @PathParam('messageID') messageID : string
    ) {
        let authorizedUser = await this.getAuthorizedUser();

        let message = await this.chatService.getSubMessage(topicID, parentMessageID, messageID);

        await this.chatService.upvote(message, { 
            id: authorizedUser.id,
            user: authorizedUser,
            createdAt: Date.now(),
            ipAddress: (WebEvent.request as express.Request).ip
        });

        return { code: 'success', message: 'Success' };
    }
}