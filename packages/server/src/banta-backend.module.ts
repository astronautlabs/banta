import { WebService, Get, Controller, Mount } from '@alterior/web-server';
import { Module } from '@alterior/di';
import { ChatModule } from './chat/chat.module';
import * as express from 'express';
import { AccountsModule } from './accounts';

@Module({
    imports: [
        AccountsModule,
        ChatModule
    ]
})
export class BantaBackendModule {
}