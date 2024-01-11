import { Component, ChangeDetectorRef, ViewChild, Renderer2   } from '@angular/core';
import { Router } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Observable, Subscription, interval  } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';

import { MatRipple} from '@angular/material/core';
import { MatDialog} from '@angular/material/dialog';

import { ConfigurationService } from '../_services/configuration.service';
import { AlertService } from '../_services/alert.service';
import { UserService } from '../_services/user.service';
import { DriveService } from '../_services/drive.service';
import { DocumentService } from '../_services/document.service';
import { MailService } from '../_services/mail.service';
import { EventService } from '../_services/event.service';
import { MailComponent } from '../mail/mail.component';
import { User } from '../_modeles/user';

@Component({
  selector: 'app-navigation',
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.scss']
})
export class NavigationComponent {

  //Various global information for initial loading
  public currentUser: User = new User();
  public currentDate: Date = new Date();
  public isLoggedIn: boolean = false;
  public isCompliant: boolean = false;
  public isLoading: boolean = true;
  private sub: Subscription;

  //Routes that do not need to be protected
  private notLoggedInRoutes: string[] = ["/conditions"];

  /** Reference to the directive instance of the ripple. */
  @ViewChild(MatRipple) ripple: MatRipple;

  isHandset$: Observable<boolean> = this.breakpointObserver.observe('(max-width: 450px)')
    .pipe(
      map(result => result.matches),
      shareReplay()
    );

  constructor(private breakpointObserver: BreakpointObserver,
    private cdr: ChangeDetectorRef,
    private renderer: Renderer2,
    public router: Router,
    public configurationService: ConfigurationService,
    public alertService: AlertService,
    public userService: UserService,
    public documentService: DocumentService,
    public driveService: DriveService,
    public mailService: MailService,
    public eventService: EventService,
    public dialog: MatDialog) {
      //Get global information to manage initial progress loader
      this.currentUser = this.userService.getCurrentUser();
      this.isLoggedIn = this.userService.isUserSignedIn();
      this.isCompliant = this.driveService.isDriveCompliant();
      this.isLoading = true;
      //Apply mode to global body
      this.changeDisplayMode();
      // SUbscribe in case the document was reloaded
      this.configurationService.darkModeChange.subscribe((darkMode: boolean) => {
        this.changeDisplayMode();
      });
    }

    ngOnInit(): void {
      this.userService.isSignInChange.subscribe((isLoggedIn: boolean) => {
        console.log("NavigationComponent:ngOnInit/isLoggedIn " + isLoggedIn);
        this.currentUser = this.userService.getCurrentUser();
        this.isLoggedIn = isLoggedIn;
        this.cdr.detectChanges();
      });
      this.driveService.driveIsCompliantChange.subscribe((isCompliant: boolean) => {
        console.log("NavigationComponent:ngOnInit/isCompliant " + isCompliant);
        this.isCompliant = isCompliant;
        this.cdr.detectChanges();
      });

      //Check every seconds if loading is finished
      this.sub = interval(1000).subscribe((val: any) => {
        //While loading add a ripple effect
        this.ripple.launch({persistent: false,centered: true});
        //If loading still continues
        if(this.isLoading){
          //Check if still loading
          this.isLoading = this.userService.isLoading || this.driveService.isLoading || this.documentService.isLoading;
          //Loading is finished then can quit interval
          if(!this.isLoading){
            this.sub.unsubscribe();
          }
        }
      });
    }

    changeDisplayMode(){
      //If the dark mode is activated then add the class otherwise remove it
      if(this.configurationService.darkModeCheck){
        this.renderer.addClass(document.body, 'dark-theme');
      }else{
        this.renderer.removeClass(document.body, 'dark-theme');
      }
    }

    public toggleTheme(){
      this.configurationService.switchDisplayMode();
    }

    public mail(){
      //Display the mail dialog
      const dialogRef = this.dialog.open(MailComponent, {
        data: {
          destinataires: '',
          emetteur: this.userService.currentUser.mail,
          sujet: "",
          contenu: "\r\n\r\nCordialement.\r\n"+this.userService.currentUser.nom,
          pieces: []
        },
      });
    }

    public saveDocument(){
      //When the autosave is not activated then function to save the document
      this.documentService.saveDocumentFile();
    }

    public isNonLoggedInRoute(): boolean{

      let isNonLoggedInRoute: boolean = false;
      isNonLoggedInRoute = (this.notLoggedInRoutes.indexOf(this.router.url) != -1);

      if(isNonLoggedInRoute){
        this.isLoading = false;
        this.sub.unsubscribe();
      }

      return isNonLoggedInRoute;
    }
}