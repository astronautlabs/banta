import { NgModule } from '@angular/core';
import { ChatBackendService } from 'src/lib';
import { FirebaseChatBackend } from './firebase-chat-backend';
import { DataStore } from './datastore';
import { AngularFireModule } from '@angular/fire';
import { environment } from 'src/environments/environment';
import { AngularFirestoreModule } from '@angular/fire/firestore';

@NgModule({
    imports: [
        AngularFireModule.initializeApp(environment.firebase),
        AngularFirestoreModule
    ],
    providers: [
        DataStore,
        { provide: ChatBackendService, useClass: FirebaseChatBackend }
    ]
})
export class FirebaseModule {

}