import "@alterior/platform-nodejs";
import { Application } from "@alterior/runtime";
import { WebService, Mount, Get } from "@alterior/web-server";
import { NotificationsProvider, AuthenticationProvider } from "@banta/common";
import { FirebaseNotificationsProvider, FirebaseAuthenticationProvider, FirebaseChatBackend, FirebaseStoreRef } from "@banta/firebase";
import { ChatBackendService, BantaBackendModule, BantaBackendController } from "@banta/server";

import * as Fb from 'firebase-admin';
import { CORSMiddleware } from "./cors";

globalThis.fetch = require('node-fetch');

let firebaseCredsFile = process.env['FIREBASE_CREDS_FILE'] || "../private/firebase-service-account.json";
console.log(`Loading firebase credentials from ${firebaseCredsFile}`);

Fb.initializeApp({
    credential: Fb.credential.cert(require(firebaseCredsFile)),
    databaseURL: process.env['FIRESTORE_URL']
});

@WebService({
    server: {
        port: 3422,
        middleware: [ CORSMiddleware ]
    },
    providers: [
        { provide: FirebaseStoreRef, useClass: FirebaseStoreRef },
        { provide: NotificationsProvider, useClass: FirebaseNotificationsProvider },
        { provide: AuthenticationProvider, useClass: FirebaseAuthenticationProvider },
        { provide: ChatBackendService, useClass: FirebaseChatBackend }
    ],
    imports: [
        BantaBackendModule
    ]
})
class ExampleService {
    @Mount() banta : BantaBackendController;

    @Get('/healthz')
    healthz() {
        return { message: 'Healthy' };
    }
}

Application.bootstrap(ExampleService);