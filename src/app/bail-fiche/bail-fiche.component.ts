import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';

import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTable } from '@angular/material/table';
import { MatTableDataSource} from '@angular/material/table';
import { MatDialog} from '@angular/material/dialog';

import { BIENTYPE } from '../_modeles/bien';
import { Bail } from '../_modeles/bail';
import { BAILTERMEPAIEMENT as bailTermePaiements } from '../_modeles/bail';
import { BAILTYPEPAIEMENT as bailTypePaiements } from '../_modeles/bail';
import { BAILPERIODEPAIEMENT as bailPeriodePaiements } from '../_modeles/bail';
import { Mouvement } from '../_modeles/mouvement';
import { UserService } from '../_services/user.service';
import { AlertService } from '../_services/alert.service';
import { DocumentService } from '../_services/document.service';
import { ConfigurationService } from '../_services/configuration.service';
import { MailComponent } from '../mail/mail.component';

@Component({
  selector: 'app-bail-fiche',
  templateUrl: './bail-fiche.component.html',
  styleUrls: ['./bail-fiche.component.scss']
})
export class BailFicheComponent implements OnInit, AfterViewInit {

  //The current bail
  public bail: Bail;
  public bienType = BIENTYPE;
  //Conversion of types in text
  public bailTermePaiements = bailTermePaiements;
  public bailTypePaiements = bailTypePaiements;
  public bailPeriodePaiements = bailPeriodePaiements;
  // All table elements for loyer mouvements
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatTable) table!: MatTable<Mouvement>;
  public dataSource: MatTableDataSource<Mouvement>;
  public displayedColumns = ['date', 'libelle', 'montant', 'quittance'];
  //All loyer mouvements for the current bail
  public quittances: Mouvement[];
  //Get in configuration the mandatary pieces for the piece container provided
  public piecesObligatoires: string;
  //The HTML element that contains element to display in PDF
  @ViewChild('fiche') fiche: ElementRef;

  constructor(
    private route: ActivatedRoute,
    private location: Location,
    public dialog: MatDialog,
    public userService: UserService,
    public configurationService: ConfigurationService,
    public documentService: DocumentService,
    private alertService: AlertService
  ) { }

  ngOnInit(): void {
    //Get all required pieces
    this.piecesObligatoires = this.configurationService.getValue("piecesObligatoiresBail");
    //Get data
    this.getData();
    //If document is reloaded then get data again and recompute mouvements
    this.documentService.docIsLoadedChange.subscribe((isLoaded: boolean) => {
      if(isLoaded){
          this.getData();
          this.getQuittances();
      }
    });
  }

  ngAfterViewInit(): void {
    
    //Get specific loyer mouvements related to that bail (mouvement for the bien, with quittance and during the bail)
    this.getQuittances();
  }

  getData(): void {
    //Get parameter id to check if it's new or existing
    const reqId = this.route.snapshot.paramMap.get('_id');
    //If an existing one is edited
    if(reqId){
      //Look for the requested one in the list
      for (var _i = 0; _i < this.documentService.document.bails.length; _i++) {
        // Find the requested one
        if(this.documentService.document.bails[_i].id == reqId){
          this.bail = this.documentService.document.bails[_i];
        }
      }
      // If the requseted one can not be found (normally impossible) go back;
      if(!this.bail){
        this.goBack();
        this.alertService.error('Impossible de trouver le bail demandé !');
      }
    // No one requested
    }else{
      this.goBack();
      this.alertService.error('Aucun bail demandé !');
    }
  }

  public goBack(): void {
    this.location.back();
  }

  public getQuittances(){
    this.quittances = [];
    for (var _i = 0; _i < this.documentService.document.mouvements.length; _i++) {
      // Find the requested one
      if(this.documentService.document.mouvements[_i].bien.id == this.bail.bien.id && 
        this.documentService.document.mouvements[_i].quittance &&
        this.documentService.document.mouvements[_i].date.setHours(0, 0, 0, 0) >= this.bail.dateDebut.setHours(0, 0, 0, 0) &&
        (!this.bail.dateFin || this.documentService.document.mouvements[_i].date.setHours(0, 0, 0, 0) <= this.bail.dateFin.setHours(0, 0, 0, 0))
      ){
        this.quittances.push(this.documentService.document.mouvements[_i]);
      }
    }
    
    // Configure table
    this.dataSource = new MatTableDataSource(this.quittances);
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
  }

  public contact(mail:string){
    //Display the mail dialog
    const dialogRef = this.dialog.open(MailComponent, {
      data: {
        destinataires: mail,
        emetteur: this.userService.currentUser.mail,
        sujet: "",
        contenu: "\r\n\r\nCordialement.\r\n"+this.userService.currentUser.nom
      },
    });
  }

  public printFiche(){
    setTimeout(()=>window.print(),1000);
  }

  scroll(anchor:string){
    if(document.getElementById(anchor)){
      document.getElementById(anchor)!.scrollIntoView({ behavior: "smooth", block: "start" });
      document.getElementById(anchor)!.classList.add('blink-piece');
      setTimeout(()=>{
        document.getElementById(anchor)!.classList.remove('blink-piece');
      },5000);
    }
  }

}
