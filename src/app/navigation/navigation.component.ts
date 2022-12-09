import { Component, ChangeDetectorRef,ViewChild, Renderer2   } from '@angular/core';
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
import { MailComponent } from '../mail/mail.component';
import { User } from '../_modeles/user';

@Component({
  selector: 'app-navigation',
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.scss']
})
export class NavigationComponent {

  public currentUser: User = new User();
  public currentDate: Date = new Date();
  public isLoggedIn: boolean = false;
  public isCompliant: boolean = false;
  public isLoading: boolean = true;
  private sub: Subscription;
  private notLoggedInRoutes: string[] = ["/conditions"];

  public darkModeCheck = true;

  /** Reference to the directive instance of the ripple. */
  @ViewChild(MatRipple) ripple: MatRipple;

  isHandset$: Observable<boolean> = this.breakpointObserver.observe('(max-width: 450px)')
    .pipe(
      map(result => result.matches),
      shareReplay()
    );

  constructor(private breakpointObserver: BreakpointObserver,
    private renderer: Renderer2,
    private cdr: ChangeDetectorRef,
    public router: Router,
    public configurationService: ConfigurationService,
    public alertService: AlertService,
    public userService: UserService,
    public documentService: DocumentService,
    public driveService: DriveService,
    public dialog: MatDialog) {
      this.currentUser = this.userService.getCurrentUser();
      this.isLoggedIn = this.userService.isUserSignedIn();
      this.isCompliant = this.driveService.isDriveCompliant();
      this.isLoading = true;

      //Get dark mode configuration in configuration service
      this.darkModeCheck = (this.configurationService.getValue('defaultTheme') == 'dark');
      //If the dark mode is activated then add the class otherwise remove it
      if(this.darkModeCheck){
        this.renderer.addClass(document.body, 'dark-theme');
      }else{
        this.renderer.removeClass(document.body, 'dark-theme');
      }
      //If the browser supports dark mode and dark mode is selected then force the darkmode
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches){
        this.darkModeCheck = true;
        this.renderer.addClass(document.body, 'dark-theme');
      }
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
          //Loading is finsihed then can qui interval
          if(!this.isLoading){
            this.sub.unsubscribe();
          }
        }
      });
    }

    public toggleTheme(){
      this.darkModeCheck = !this.darkModeCheck;
      if(this.darkModeCheck){
        this.renderer.addClass(document.body, 'dark-theme');
      }else{
        this.renderer.removeClass(document.body, 'dark-theme');
      }
    }

    public mail(){
      //Display the mail dialog
      const dialogRef = this.dialog.open(MailComponent, {
        data: {
          destinataires: '',
          emetteur: '',
          sujet: "",
          contenu: "\r\n\r\nCordialement.\r\n"+this.userService.currentUser.nom
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