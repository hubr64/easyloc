//Standard Angular modules
import { NgModule,LOCALE_ID  } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AppRoutingModule } from './app-routing.module';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { LayoutModule } from '@angular/cdk/layout';
import { HttpClientModule, HttpClient, HTTP_INTERCEPTORS } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';

//Material Angular modules
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatCardModule } from '@angular/material/card';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule} from '@angular/material/form-field'; 
import { MatInputModule} from '@angular/material/input';
import { MatRippleModule, MAT_RIPPLE_GLOBAL_OPTIONS, RippleGlobalOptions} from '@angular/material/core'; 
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatProgressBarModule} from '@angular/material/progress-bar';
import { MatDialogModule} from '@angular/material/dialog'; 
import { MatCheckboxModule} from '@angular/material/checkbox';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule} from '@angular/material/divider'; 
import { MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { MatSelectModule} from '@angular/material/select';
import { MatTabsModule} from '@angular/material/tabs';
import { MatDatepickerModule } from '@angular/material/datepicker'; 
import { MatNativeDateModule, MAT_DATE_LOCALE } from '@angular/material/core';
import { MatAutocompleteModule} from '@angular/material/autocomplete';
import { MatRadioModule} from '@angular/material/radio';
import { MatStepperModule} from '@angular/material/stepper';
import { MatExpansionModule} from '@angular/material/expansion';
import { MatButtonToggleModule} from '@angular/material/button-toggle';
//Other libraries
import { NgxEchartsModule } from 'ngx-echarts';
//Services
import { AlertService } from './_services/alert.service';
import { UserService } from './_services/user.service';
import { DriveService } from './_services/drive.service';
import { DocumentService } from './_services/document.service';
import { EventService } from './_services/event.service';
import { ConfigurationService } from './_services/configuration.service';
import { ExportCsvService } from './_services/export-csv.service';
// Standard Components
import { AppComponent } from './app.component';
// Custom components
import { NavigationComponent } from './navigation/navigation.component';
import { MyComponent } from './my/my.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { BrowseComponent } from './browse/browse.component';
import { ConfigurationComponent } from './configuration/configuration.component';
import { MailComponent } from './mail/mail.component';
import { DialogReloadComponent } from './dialog-reload/dialog-reload.component';
import { DialogDeleteConfirmComponent } from './dialog-delete-confirm/dialog-delete-confirm.component';
import { ConditionsComponent } from './conditions/conditions.component';
import { LocataireDetailsComponent } from './locataire-details/locataire-details.component';
import { LocataireListeComponent } from './locataire-liste/locataire-liste.component';
import { LocataireFicheComponent } from './locataire-fiche/locataire-fiche.component';
import { BailListeComponent } from './bail-liste/bail-liste.component';
import { BailDetailsComponent } from './bail-details/bail-details.component';
import { BailFicheComponent } from './bail-fiche/bail-fiche.component';
import { BailleurListeComponent } from './bailleur-liste/bailleur-liste.component';
import { BailleurDetailsComponent } from './bailleur-details/bailleur-details.component';
import { BienDetailsComponent } from './bien-details/bien-details.component';
import { BienListeComponent } from './bien-liste/bien-liste.component';
import { BienFicheComponent } from './bien-fiche/bien-fiche.component';
import { PieceListeComponent } from './piece-liste/piece-liste.component';
import { PieceDetailsComponent } from './piece-details/piece-details.component';
import { PiecesJointesComponent } from './pieces-jointes/pieces-jointes.component';
import { PiecesJointesFicheComponent } from './pieces-jointes-fiche/pieces-jointes-fiche.component';
import { PiecesChoixComponent } from './pieces-choix/pieces-choix.component';
import { PieceUsersComponent } from './piece-users/piece-users.component';
import { UploadComponent } from './upload/upload.component';
import { PiecesJointesDetailsComponent } from './pieces-jointes-details/pieces-jointes-details.component';
import { PiecesJointesListeComponent } from './pieces-jointes-liste/pieces-jointes-liste.component';
import { MouvementListeComponent } from './mouvement-liste/mouvement-liste.component';
import { MouvementDetailsComponent } from './mouvement-details/mouvement-details.component';
import { QuittancesComponent } from './quittances/quittances.component';
import { StatistiquesDetailsComponent } from './statistiques-details/statistiques-details.component';
import { StatistiquesImpotsComponent } from './statistiques-impots/statistiques-impots.component';
import { BailNewComponent } from './bail-new/bail-new.component';
import { EventsListeComponent, EventsListeComponentSheet } from './events-liste/events-liste.component';
import { EventsComponent } from './events/events.component';
import { EventsFicheComponent } from './events-fiche/events-fiche.component';
import { MouvementPickDialogComponent } from './mouvement-pick-dialog/mouvement-pick-dialog.component';
import { CompteurListeComponent } from './compteur-liste/compteur-liste.component';
import { CompteurDetailsComponent } from './compteur-details/compteur-details.component';
import { CompteurValueDetailsComponent } from './compteur-value-details/compteur-value-details.component';
import { CompteurValueFicheComponent } from './compteur-value-fiche/compteur-value-fiche.component';
import { StatistiquesBailsComponent } from './statistiques-bails/statistiques-bails.component';
import { BienVentilationComponent } from './bien-ventilation/bien-ventilation.component';
import { BienVentilationBottomSheetComponent } from './bien-ventilation/bien-ventilation.component';
// Helpers
import { FilterConfigurationPipe } from './_helpers/filter-configuration.pipe';
import { DndDirective } from './_helpers/dnd.directive';
import { VarDirective } from './_helpers/ng-var.directive';
import { OrderByPipe } from './_helpers/orderby.pipe';

registerLocaleData(localeFr);

const globalRippleConfig: RippleGlobalOptions = {
  disabled: false,
  animation: {
    enterDuration: 500,
    exitDuration: 800
  }
};

@NgModule({
  declarations: [
    AppComponent,
    FilterConfigurationPipe,
    DndDirective,
    VarDirective,
    OrderByPipe,
    NavigationComponent,
    DashboardComponent,
    LocataireDetailsComponent,
    LocataireListeComponent,
    MyComponent,
    ConfigurationComponent,
    DialogDeleteConfirmComponent,
    MailComponent,
    BailleurListeComponent,
    BailleurDetailsComponent,
    UploadComponent,
    PieceListeComponent,
    PiecesJointesComponent,
    PiecesChoixComponent,
    PieceUsersComponent,
    BienDetailsComponent,
    BienListeComponent,
    BailListeComponent,
    BailDetailsComponent,
    PiecesJointesDetailsComponent,
    PiecesJointesListeComponent,
    QuittancesComponent,
    MouvementListeComponent,
    MouvementDetailsComponent,
    BrowseComponent,
    BailFicheComponent,
    PiecesJointesFicheComponent,
    BienFicheComponent,
    ConditionsComponent,
    LocataireFicheComponent,
    DialogReloadComponent,
    StatistiquesDetailsComponent,
    StatistiquesImpotsComponent,
    BailNewComponent,
    PieceDetailsComponent,
    EventsListeComponent,
    EventsListeComponentSheet,
    EventsComponent,
    EventsFicheComponent,
    MouvementPickDialogComponent,
    CompteurListeComponent,
    CompteurDetailsComponent,
    CompteurValueDetailsComponent,
    CompteurValueFicheComponent,
    StatistiquesBailsComponent,
    BienVentilationComponent,
    BienVentilationBottomSheetComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    LayoutModule,
    MatToolbarModule,
    MatButtonModule,
    MatSidenavModule,
    MatIconModule,
    MatListModule,
    MatGridListModule,
    MatCardModule,
    MatMenuModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatRippleModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatProgressBarModule,
    MatDialogModule,
    MatCheckboxModule,
    MatBadgeModule,
    MatDividerModule,
    MatBottomSheetModule,
    MatSelectModule,
    MatTabsModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatAutocompleteModule,
    MatRadioModule,
    MatStepperModule,
    MatExpansionModule,
    MatButtonToggleModule,
    NgxEchartsModule.forRoot({
      echarts: () => import('echarts'), 
    }),
  ],
  providers: [
    UserService,
    DriveService,
    DocumentService,
    ConfigurationService,
    AlertService,
    EventService,
    ExportCsvService,
    {provide: MAT_RIPPLE_GLOBAL_OPTIONS, useValue: globalRippleConfig},
    {provide: MAT_DATE_LOCALE, useValue: 'fr-FR'},
    {provide: LOCALE_ID, useValue: 'fr-FR'},
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
