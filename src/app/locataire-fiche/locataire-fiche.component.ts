import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';

import { MatDialog} from '@angular/material/dialog';

import { Locataire } from '../_modeles/locataire';
import { Bail } from '../_modeles/bail';
import { BAILTERMEPAIEMENT as bailTermePaiements } from '../_modeles/bail';
import { BAILTYPEPAIEMENT as bailTypePaiements } from '../_modeles/bail';
import { BAILPERIODEPAIEMENT as bailPeriodePaiements } from '../_modeles/bail';
import { UserService } from '../_services/user.service';
import { AlertService } from '../_services/alert.service';
import { DocumentService } from '../_services/document.service';
import { ConfigurationService } from '../_services/configuration.service';
import { MailComponent } from '../mail/mail.component';

@Component({
  selector: 'app-locataire-fiche',
  templateUrl: './locataire-fiche.component.html',
  styleUrls: ['./locataire-fiche.component.scss']
})
export class LocataireFicheComponent implements OnInit {

  //The current locataire
  public locataire: Locataire;
  //The bail for the current locataire
  public bail: Bail;
  //Conversion of types in text
  public bailTermePaiements = bailTermePaiements;
  public bailTypePaiements = bailTypePaiements;
  public bailPeriodePaiements = bailPeriodePaiements;
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
    this.piecesObligatoires = this.configurationService.getValue("piecesObligatoiresLocataire");

    //Get data
    this.getData();
  }

  getData(): void {
    //Get parameter id to check if it's new or existing
    const reqId = this.route.snapshot.paramMap.get('_id');
    //If an existing one is edited
    if(reqId){
      //Look for the requested one in the list
      for (var _i = 0; _i < this.documentService.document.locataires.length; _i++) {
        // Find the requested one
        if(this.documentService.document.locataires[_i].id == reqId){
          this.locataire = this.documentService.document.locataires[_i];
        }
      }
      // If the requseted one can not be found (normally impossible) go back;
      if(!this.locataire){
        this.goBack();
        this.alertService.error('Impossible de trouver le locataire demandé !');
      }else{
        for (var _i = 0; _i < this.documentService.document.bails.length; _i++) {
          // Find the requested one
          if(this.documentService.document.bails[_i].locataire.id == reqId){
            this.bail = this.documentService.document.bails[_i];
          }
        }
      }
    // No one requested
    }else{
      this.goBack();
      this.alertService.error('Aucun locataire demandé !');
    }
  }

  public goBack(): void {
    this.location.back();
  }

  public printFiche(){
    setTimeout(()=>window.print(),1000);
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

}
