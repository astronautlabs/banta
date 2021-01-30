import { WebService, Get, Controller, Mount } from '@alterior/web-server';
import { ChatModule } from './chat/chat.module';
import { InfrastructureModule } from './infrastructure';
import * as express from 'express';
import { AccountsModule } from './accounts';
import { FirebaseModule } from './firebase/firebase.module';

@WebService({
    imports: [
        InfrastructureModule,
        AccountsModule,
        ChatModule,
        FirebaseModule
    ],
    server: {
        middleware: [
            (req : express.Request, res : express.Response, next) => {
                res.header('Access-Control-Allow-Origin', req.header('Origin') || '*');
                res.header('Access-Control-Allow-Headers', 'authorization, content-type');
                res.header('Access-Control-Allow-Methods', 'head, get, post, put, delete');
                next();
            }
        ]
    }
})
export class Service {
    @Get('/')
    info() {
        return {
            service: '@banta/server',
            version: '1.0'
        };
    }
}