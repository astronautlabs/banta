import { Controller, Post, Body, RouteEvent, PathParam, Response } from "@alterior/web-server";
import { ChatMessage } from "./chat-message";
import { User, NewUserAccount, AccountsService } from "../accounts";
import * as jwt from 'jsonwebtoken';
import { ChatService } from "./chat.service";
import * as bodyParser from 'body-parser';
import { HttpError } from "@alterior/common";
import * as fbc from 'firebase';

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

    @Post(`/topics/:topicID/messages`, {
    })
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

    @Post(`/topics/:topicID/messages/:messageID/messages`, {
    })
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