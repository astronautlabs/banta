import { Controller, Post, Body, Response, Get } from "@alterior/web-server";
import { NewUserAccount, SignUpResult, NoticeNotification } from "@banta/common";
import { AccountsService } from "./accounts.service";
import * as bodyParser from 'body-parser';

@Controller('/accounts', {
    middleware: [
        bodyParser.json()
    ]
})
export class AccountsController {
    constructor(
        private accounts : AccountsService
    ) {

    }
    
    @Post('/accounts')
    async signup(@Body() user : Partial<NewUserAccount>) {
        if (!user.email || !user.password)
            return Response.badRequest({ message: 'Bad request, please check all fields and try again' });
        
        let signupResult : SignUpResult;

        try {
            signupResult = await this.accounts.signUp(user);
        } catch (e) {
            if (e.code === 'auth/email-already-exists') {
                return Response.badRequest({ message: 'Account with that email already exists'});
            }
            if (e.code === 'auth/username-already-exists') {
                return Response.badRequest({ message: `Username '${user.username}' is not available`});
            }

            console.log(`Caught error (code=${e.code}) while creating user: `);
            console.error(e);

            return Response.serverError({
                message: `Internal server error (fb_signup)`
            })
        }

        await this.accounts.sendNotification(<NoticeNotification>{
            recipientId: signupResult.user.id,
            type: 'notice',
            message: 'Welcome! Thanks for signing up!',
            actionLabel: 'Get started',
            actionUrl: 'https://example.com/'
        })

        return signupResult;
    }
}