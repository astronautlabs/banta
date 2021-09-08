
import { Application } from "@alterior/runtime";
import { Module } from "@alterior/di";
import { NotificationsProvider, AuthenticationProvider, ChatBackend } from "@banta/common";
import { FirebaseNotificationsProvider, FirebaseAuthenticationProvider, FirebaseChatBackend } from "@banta/firebase";

@Module({
    providers: [
        { provide: NotificationsProvider, useClass: FirebaseNotificationsProvider },
        { provide: AuthenticationProvider, useClass: FirebaseAuthenticationProvider },
        { provide: ChatBackend, useClass: FirebaseChatBackend }
    ],
    imports: [
        BantaServerModule
    ]
})
class ServerModule {}

Application.bootstrap(ServerModule);