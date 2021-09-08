import { Controller, Post, Body, RouteEvent, PathParam, Response, Patch } from "@alterior/web-server";
import { ChatMessage, User } from "@banta/common";
import { AccountsService } from "../accounts";
import { ChatService } from "./chat.service";
import * as bodyParser from 'body-parser';
import { HttpError } from "@alterior/common";

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

    async getAuthorizedUser(event : RouteEvent): Promise<User> {
        let authorization = event.request.header('authorization');

        if (authorization && /^bearer .*/i.test(authorization)) {
            let tokenStr = authorization.replace(/^bearer /i, '');
            let user = await this.accounts.validateToken(tokenStr);
            if (user)
                return user;
        }

        throw new HttpError(401, [], { message: 'Unauthorized' });
    }

    @Post(`/topics/:topicID/messages`)
    async post(
        event : RouteEvent, 
        @PathParam('topicID') topicId : string, 
        @Body() message : ChatMessage
    ) {
        let authorizedUser = await this.getAuthorizedUser(event);

        message.user = authorizedUser;
        message.topicId = topicId;

        this.chatService.post(message);
        return {
            code: 'success',
            message: 'Success'
        };
    }

    @Post(`/topics/:topicID/messages/:messageID/upvote`)
    async upvoteMessage(
        event : RouteEvent, 
        @PathParam('topicID') topicID : string, 
        @PathParam('messageID') messageID : string
    ) {
        let authorizedUser = await this.getAuthorizedUser(event);

        let message = await this.chatService.getMessage(topicID, messageID);

        await this.chatService.upvote(message, { 
            id: authorizedUser.id,
            user: authorizedUser,
            createdAt: Date.now(),
            ipAddress: event.request.ip
        });

        return { code: 'success', message: 'Success' };
    }

    @Post(`/topics/:topicID/messages/:parentMessageID/messages/:messageID/upvote`)
    async upvoteSubMessage(
        event : RouteEvent, 
        @PathParam('topicID') topicID : string, 
        @PathParam('parentMessageID') parentMessageID : string, 
        @PathParam('messageID') messageID : string
    ) {
        let authorizedUser = await this.getAuthorizedUser(event);

        let message = await this.chatService.getSubMessage(topicID, parentMessageID, messageID);

        await this.chatService.upvote(message, { 
            id: authorizedUser.id,
            user: authorizedUser,
            createdAt: Date.now(),
            ipAddress: event.request.ip
        });

        return { code: 'success', message: 'Success' };
    }

    @Post(`/topics/:topicID/messages/:messageID/messages`)
    async subPost(
        event : RouteEvent, 
        @PathParam('topicID') topicID : string, 
        @PathParam('messageID') messageID : string, 
        @Body() message : ChatMessage
    ) {
        let authorizedUser = await this.getAuthorizedUser(event);

        message.user = authorizedUser;
        message.topicId = topicID;

        try {
            await this.chatService.postSubMessage(topicID, messageID, message);
        } catch (e) {
            console.error(`Failed to post sub-message to ${topicID}/${messageID}: ${e.message} [code=${e.code}]`);
            return Response.badRequest({ message: e.message, code: e.code });
        }

        return {
            code: 'success',
            message: 'Success'
        };
    }
}