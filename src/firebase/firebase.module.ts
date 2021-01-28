import { Module } from '@alterior/di';
import { AuthenticationProvider, NotificationsProvider } from 'accounts';
import { FirebaseAuthenticationProvider } from './firebase-authentication-provider';
import { FirebaseNotificationsProvider } from './firebase-notifications-provider';

@Module({
    providers: [
        { provide: AuthenticationProvider, useClass: FirebaseAuthenticationProvider },
        { provide: NotificationsProvider, useClass: FirebaseNotificationsProvider }
    ]
})
export class FirebaseModule {
}