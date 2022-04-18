import { Module } from '@alterior/di';
import { ChatModule } from './chat/chat.module';
import { AccountsModule } from './accounts';

@Module({
    imports: [
        AccountsModule,
        ChatModule
    ]
})
export class BantaBackendModule {
}