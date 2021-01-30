import { Component, HostBinding } from '@angular/core';
import * as firebase from 'firebase';
import { BantaService, ChatBackendService, User } from '../lib';
import { Router, NavigationEnd } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { AboutComponent, LoginComponent, AuthenticationService } from '@astronautlabs/chassis';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  constructor(
    private auth : AuthenticationService,
    private backend : ChatBackendService,
    private router : Router,
    private matDialog : MatDialog,
    private banta : BantaService
  ) {
    this.year = new Date().getFullYear();
  }

  year = 2020;
  title = 'engage';
  user : User;

  @HostBinding('class.demo')
  demoMode = false;

  @HostBinding('class.mat-dark-theme')
  darkTheme = true;

  ngOnInit() {
    
    this.auth.userChanged.subscribe(async user => {
      if (user) {
        let token = await user.account.getIdToken()
        this.user = this.banta.user = {
          id: user.account.uid,
          displayName: user.profile.displayName,
          username: 'bob', //user.profile.username
          token
        };

      } else {
        this.banta.user = null;
        this.user = null;
      }
    });

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
    this.matDialog.open(LoginComponent);
  }

  showSignIn() {
    this.matDialog.open(LoginComponent);
  }

  showAbout() {
    this.matDialog.open(AboutComponent);
  }
}
