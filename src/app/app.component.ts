import { Component, HostBinding } from '@angular/core';
import * as firebase from 'firebase';
import { AccountsService } from 'src/lib/accounts';
import { ChatBackendService, User } from '../lib';
import { Router, NavigationEnd } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { AboutComponent, LoginComponent } from '@astronautlabs/chassis';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  constructor(
    private accounts : AccountsService,
    private backend : ChatBackendService,
    private router : Router,
    private matDialog : MatDialog
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
    this.backend.userChanged.subscribe(user => this.user = user);

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
    this.accounts.showSignUp();
  }

  showSignIn() {
    this.matDialog.open(LoginComponent);
  }

  showAbout() {
    this.matDialog.open(AboutComponent);
  }
}
