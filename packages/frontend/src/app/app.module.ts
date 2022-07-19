import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HomeComponent } from './home/home.component';
import { MaterialModule } from '../material.module';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BantaSdkModule } from '@banta/sdk';
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
import { TryChatComponent } from './try-chat/try-chat.component';
import { CDNProvider, DataURICDNProvider } from '@banta/common';
import { ChatBackendBase } from 'projects/sdk/src/lib';


@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    NotFoundComponent,
    SourceComponent,
    TryComponent,
    TryChatComponent,
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
    BantaSdkModule.configure(),
    MarkdownModule.forRoot()
  ],
  providers: [
    DemoService,
    {
      provide: CDNProvider,
      useFactory: () => new DataURICDNProvider()
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
