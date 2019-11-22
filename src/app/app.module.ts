import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HomeComponent } from './home/home.component';
import { EngageComponent } from './engage/engage.component';
import { MaterialModule } from './material.module';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { EngageLogoComponent } from './engage-logo.component';
import { EmojiSelectorPanelComponent } from './emoji-selector-panel/emoji-selector-panel.component';
import { ChatViewComponent } from './chat-view/chat-view.component';
import { CommentViewComponent } from './comment-view/comment-view.component';

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    EngageComponent,
    EngageLogoComponent,
    EmojiSelectorPanelComponent,
    ChatViewComponent,
    CommentViewComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    MaterialModule,
    BrowserAnimationsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
