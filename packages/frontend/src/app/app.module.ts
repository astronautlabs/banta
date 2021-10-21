import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HomeComponent } from './home/home.component';
import { MaterialModule } from '../material.module';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BantaSdkModule, ChatBackendService } from '@banta/sdk';
import { SaasModule } from 'src/saas/saas.module';
import { NotFoundComponent } from './not-found.component';
import { SourceComponent } from './source/source.component';
import { TryComponent } from './try/try.component';
import { DemoService } from './demo.service';
import { DemoComponent } from './demo.component';
import { MarkdownModule } from 'ngx-markdown';
import { DevComponent } from './dev/dev.component';

// KEEP [see below]
import { MockBackend } from './mock-backend';
import { FirebaseAuthenticationProvider, FirebaseChatBackend, FirebaseNotificationsProvider, FirebaseStoreRef } from '@banta/firebase';
import { BantaServiceChatBackend } from '@banta/client';


@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    NotFoundComponent,
    SourceComponent,
    TryComponent,
    DemoComponent,
    DevComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    MaterialModule,
    BrowserAnimationsModule,
    SaasModule,
    BantaSdkModule.forRoot(),
    MarkdownModule.forRoot()
  ],
  providers: [
    DemoService,

    /** <-- Add another slash to configure for Firebase
    FirebaseStoreRef,
    {
        provide: FirebaseNotificationsProvider,
        deps: [ FirebaseStoreRef ],
        useFactory: storeRef => new FirebaseNotificationsProvider(storeRef)
    },
    {
      provide: FirebaseAuthenticationProvider,
      deps: [ FirebaseStoreRef ],
      useFactory: storeRef => new FirebaseNotificationsProvider(storeRef)
    },
    {
        provide: FirebaseChatBackend,
        deps: [ FirebaseAuthenticationProvider, FirebaseNotificationsProvider, FirebaseStoreRef ],
        useFactory: (auth, notifs, storeRef) => new FirebaseChatBackend(auth, notifs, storeRef)
    },
    {
        provide: ChatBackendService, 
        deps: [ FirebaseChatBackend ],
        useFactory: (firebaseBackend) => 
            new BantaServiceChatBackend(firebaseBackend, 'http://localhost:3422')
    }
    /*/
    { provide: ChatBackendService, useClass: MockBackend }
    // */
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
