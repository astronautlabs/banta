import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HomeComponent } from './home/home.component';

import { MaterialModule } from '../material.module';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { LibModule } from '../lib';
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
    LibModule,
    FirebaseModule,
    MarkdownModule.forRoot(),
    ChassisModule.configure(PRODUCT)
  ],
  providers: [
    DemoService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
