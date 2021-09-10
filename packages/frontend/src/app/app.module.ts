import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HomeComponent } from './home/home.component';

import { ChatBackend, NotificationsProvider, AuthenticationProvider } from "@banta/common";
import { FirebaseAuthenticationProvider, FirebaseNotificationsProvider, FirebaseChatBackend, FirebaseStoreRef } from "@banta/firebase";
import { BantaServiceChatBackend } from "@banta/client"; 

import { MaterialModule } from '../material.module';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BantaSdkModule, ChatBackendService } from '@banta/sdk';
import { FirebaseModule } from 'src/firebase/firebase.module';
import { FeaturesComponent } from './features/features.component';
import { PricingComponent } from './pricing/pricing.component';
import { SaasModule } from 'src/saas/saas.module';
import { NotFoundComponent } from './not-found.component';
import { SourceComponent } from './source/source.component';
import { TryComponent } from './try/try.component';
import { DemoService } from './demo.service';
import { DemoComponent } from './demo.component';
import { MarkdownModule } from 'ngx-markdown';
import { ChassisModule } from '@astronautlabs/chassis';
import { PRODUCT } from './content';
import { AngularPlatform } from '@alterior/platform-angular';
import { Module } from '@alterior/di';

@Module({
  providers: [
    FirebaseStoreRef,
    { provide: AuthenticationProvider, useClass: FirebaseAuthenticationProvider },
    FirebaseChatBackend,
    { 
      provide: ChatBackendService, 
      useFactory: (firebase : FirebaseChatBackend) => new BantaServiceChatBackend(firebase), 
      deps: [FirebaseChatBackend] 
    },
    { provide: NotificationsProvider, useClass: FirebaseNotificationsProvider }
  ]
})
export class BantaProviders {}

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    FeaturesComponent,
    PricingComponent,
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
    FirebaseModule,
    MarkdownModule.forRoot(),
    ChassisModule.configure(PRODUCT)
  ],
  providers: [
    DemoService,
    AngularPlatform.bridge(BantaProviders)
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
