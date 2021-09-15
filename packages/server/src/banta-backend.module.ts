import { WebService, Get, Controller, Mount } from '@alterior/web-server';
import { ChatModule } from './chat/chat.module';
import * as express from 'express';
import { AccountsModule } from './accounts';

@WebService({
    imports: [
        AccountsModule,
        ChatModule
    ]
})
export class BantaBackendModule {
}