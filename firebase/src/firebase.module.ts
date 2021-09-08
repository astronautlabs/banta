import { Module } from '@alterior/di';
import { AuthenticationProvider, NotificationsProvider, ChatBackend } from '@banta/common';
import { FirebaseAuthenticationProvider } from './firebase-authentication-provider';
import { FirebaseChatBackend } from './firebase-chat-backend';
import { FirebaseNotificationsProvider } from './firebase-notifications-provider';
import { FirebaseStoreRef } from './firebase-store-ref';

// TODO
// import { FIREBASE_FIRESTORE_URL, GCP_PROJECT_ID, LOCAL_GCP_CREDENTIALS } from '../constants';

// let firebaseOptions : firebaseAdmin.AppOptions = {
//     projectId: GCP_PROJECT_ID,
//     databaseURL: FIREBASE_FIRESTORE_URL
// };

// if (LOCAL_GCP_CREDENTIALS)
//     firebaseOptions.credential = firebaseAdmin.credential.cert(LOCAL_GCP_CREDENTIALS);

// firebaseAdmin.initializeApp(firebaseOptions);
// firebase.initializeApp(firebaseOptions);

// @Module({
//     providers: [
//         FirebaseStoreRef,
//         { provide: AuthenticationProvider, useClass: FirebaseAuthenticationProvider },
//         { provide: NotificationsProvider, useClass: FirebaseNotificationsProvider },
//         { provide: ChatBackend, useClass: FirebaseChatBackend }
//     ]
// })
// export class FirebaseModule {
// }