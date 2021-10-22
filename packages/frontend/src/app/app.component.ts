import { Component, HostBinding, Optional } from '@angular/core';
import { BantaService, ChatBackendService } from '@banta/sdk';
import { User } from '@banta/common';
import { Router, NavigationEnd } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { environment } from 'src/environments/environment';
import { BantaServiceChatBackend } from '@banta/client';
import * as firebase from 'firebase/app';
import 'firebase/auth';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  constructor(
    private backend : ChatBackendService,
    private router : Router,
    private matDialog : MatDialog,
    private banta : BantaService,
    @Optional() private chatBackend : ChatBackendService
  ) {
    this.year = new Date().getFullYear();
  }

  year = 2020;
  title = 'Banta';
  user : User;

  @HostBinding('class.demo')
  demoMode = false;

  @HostBinding('class.mat-dark-theme')
  darkTheme = true;

  get showDevTools() {
    return !environment.production;
  }

  ngOnInit() {
    if (this.chatBackend instanceof BantaServiceChatBackend) {
      // using example-server
      let bantaService = this.chatBackend;
      firebase.auth().onAuthStateChanged(async user => {
        this.banta.user = {
          createdAt: null,
          displayName: user.displayName,
          email: user.email,
          updatedAt: null,
          username: user.email.replace(/@.*/, '')
        };
        if (user)
          bantaService.userToken = await user.getIdToken();
        else
          bantaService.userToken = null;
      });

      console.group(`DEV TOOLS for BANTA on FIREBASE`);
      console.log(` - Use bantafb.signIn(email, password) to sign in`);
      console.log(` - Use bantafb.signOut() to sign out`);
      console.groupEnd();

      window['bantafb'] = {
        signIn: async (email, password) => {
          try {
            await firebase.auth().signInWithEmailAndPassword(email, password);
            console.log(`Signed in successfully`);
          } catch (e) {
            console.error(`Failed to sign in: ${e.message}`);
          }
        },
        signOut: async () => {
          try {
            await firebase.auth().signOut();
            console.log(`Signed out successfully`);
          } catch (e) {
            console.error(`Failed to sign out: ${e.message}`);
          }
        }
      }

    } else {
      // mock mode
      this.banta.user = {
        username: 'me',
        displayName: 'Me',
        email: 'me@example.com',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        avatarUrl: `https://gravatar.com/avatar/example?s=${Date.now().toString(16)}&d=robohash`,
        token: 'abc123'
      };
    }

    this.router.events.subscribe(ev => {
      if (ev instanceof NavigationEnd) {
        if (ev.url.startsWith('/demo/')) {
          if (!this.demoMode) {
            this.demoMode = true;
          }
        } else {
          if (this.demoMode) {
            this.demoMode = false;
          }
        }
      }
    });
  }

  showSignUp() {
    //this.matDialog.open(LoginComponent);
  }

  showSignIn() {
    //this.matDialog.open(LoginComponent);
  }

  showAbout() {
    //this.matDialog.open(AboutComponent);
  }
}
