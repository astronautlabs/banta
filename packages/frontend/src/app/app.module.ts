import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HomeComponent } from './home/home.component';

import { NotificationsProvider, AuthenticationProvider } from "@banta/common";
import { FirebaseAuthenticationProvider, FirebaseNotificationsProvider, FirebaseChatBackend, FirebaseStoreRef } from "@banta/firebase";
import { BantaServiceChatBackend } from "@banta/client"; 

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
import { environment } from '../environments/environment';


@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    NotFoundComponent,
    SourceComponent,
    TryComponent,
    DemoComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    MaterialModule,
    BrowserAnimationsModule,
    SaasModule,
    BantaSdkModule,
    MarkdownModule.forRoot()
  ],
  providers: [
    DemoService,

    FirebaseStoreRef,
    { 
      provide: AuthenticationProvider, 
      useClass: FirebaseAuthenticationProvider, 
      deps: [ FirebaseStoreRef ] 
    },
    { 
      provide: FirebaseChatBackend, 
      useClass: FirebaseChatBackend, 
      deps: [ AuthenticationProvider, NotificationsProvider, FirebaseStoreRef ] 
    },
    { 
      provide: ChatBackendService, 
      useFactory: (firebase : FirebaseChatBackend) => new BantaServiceChatBackend(firebase, environment.bantaServiceUrl), 
      deps: [FirebaseChatBackend] 
    },
    { provide: NotificationsProvider, useClass: FirebaseNotificationsProvider, deps: [ FirebaseStoreRef ] }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
