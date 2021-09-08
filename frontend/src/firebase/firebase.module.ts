import { NgModule } from '@angular/core';
import { ChatBackendService } from '@banta/sdk';
import { FirebaseChatBackend } from './firebase-chat-backend';
import { DataStore } from './datastore';
import { AngularFireModule } from '@angular/fire';
import { environment } from 'src/environments/environment';
import { AngularFirestoreModule } from '@angular/fire/firestore';
import { AngularFireAuthModule } from '@angular/fire/auth';

@NgModule({
    imports: [
        AngularFireModule.initializeApp(environment.firebase),
        AngularFirestoreModule,
        AngularFireAuthModule
        
    ],
    providers: [
        DataStore,
        { provide: ChatBackendService, useClass: FirebaseChatBackend }
    ]
})
export class FirebaseModule {
    constructor() {
    }
}