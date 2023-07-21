import { Component, HostBinding } from '@angular/core';
import { User } from '@banta/common';
import { Router, NavigationEnd } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { environment } from 'src/environments/environment';
import { ChatBackendBase } from '@banta/sdk';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  constructor(
    private backend : ChatBackendBase,
    private router : Router,
    private matDialog : MatDialog
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
    this.backend.user = {
      id: 'abc',
      username: 'bob',
      displayName: 'Bob',
      avatarUrl: `https://gravatar.com/avatar/${Date.now().toString(16)}?s=512&d=robohash`,
      token: 'abc123'
    };

    (window as any).becomeBob = () => {
      this.backend.user = {
        id: 'abc',
        username: 'bob',
        displayName: 'Bob',
        avatarUrl: `https://gravatar.com/avatar/${Date.now().toString(16)}?s=512&d=robohash`,
        token: 'abc123'
      };
    };
    (window as any).becomeAlice = () => {
      this.backend.user = {
        id: 'def',
        username: 'alice',
        displayName: 'Alice',
        avatarUrl: `https://gravatar.com/avatar/${Date.now().toString(16)}?s=512&d=robohash`,
        token: 'def321'
      };
    };

    (window as any).becomeBob();

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
