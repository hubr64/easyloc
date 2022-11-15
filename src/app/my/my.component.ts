import { Component, OnInit, ChangeDetectorRef } from '@angular/core';

import { DriveService } from '../_services/drive.service';
import { AlertService } from '../_services/alert.service';
import { UserService } from '../_services/user.service';
import { User } from '../_modeles/user';

@Component({
  selector: 'app-my',
  templateUrl: './my.component.html',
  styleUrls: ['./my.component.scss']
})
export class MyComponent implements OnInit {

  public currentUser: User = new User();
  public isLoggedIn: boolean = false;

  constructor(
    private cdRef: ChangeDetectorRef,
    public driveService: DriveService,
    public userService: UserService,
    public alertService: AlertService
  ) {
    this.currentUser = this.userService.getCurrentUser();
    this.isLoggedIn = this.userService.isUserSignedIn();
   }

  ngOnInit(): void {
    this.userService.isSignInChange.subscribe((isLoggedIn: boolean) => {
      this.currentUser = this.userService.getCurrentUser();
      this.isLoggedIn = this.userService.isUserSignedIn();
      this.cdRef.detectChanges();
    });
  }

  public signIn() {
    this.userService.signIn();
  }

  public signOut() {
    this.userService.signOut();
  }
}
