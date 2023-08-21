import { Component, OnInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatDialog} from '@angular/material/dialog';
import { Location } from '@angular/common';

import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import {DateAdapter, NativeDateAdapter, MAT_DATE_LOCALE} from '@angular/material/core';

import { Bail } from '../_modeles/bail';
import { Piece } from '../_modeles/piece';
import { Mouvement } from '../_modeles/mouvement';
import { DriveService } from '../_services/drive.service';
import { MailService } from '../_services/mail.service';
import { DocumentService } from '../_services/document.service';
import { AlertService } from '../_services/alert.service';
import { ConfigurationService } from '../_services/configuration.service';
import { MouvementPickDialogComponent } from '../mouvement-pick-dialog/mouvement-pick-dialog.component';

//French month names (easyer to define them rather then import complex JS lib as moment)
const MOIS_FR: string[] = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

//Define a specific adaptater to display just month and year
export class CustomDateAdapter extends NativeDateAdapter {
  override format(date: Date, displayFormat: any): string {
      return MOIS_FR[date.getMonth()] + ' ' + date.getFullYear();
  }
}

@Component({
  selector: 'app-quittances',
  templateUrl: './quittances.component.html',
  styleUrls: ['./quittances.component.scss'],
  providers: [
    {
      provide: DateAdapter,
      useClass: CustomDateAdapter,
      deps: [MAT_DATE_LOCALE],
    },
  ],
})
export class QuittancesComponent implements OnInit {

  //Global form
  public quittanceForm: FormGroup;
  //The HTML element that contains element to display in PDF
  @ViewChild('quittance') quittance: ElementRef;
  //Various quittance information
  private quittanceMailSujet: string = '';
  private quittanceMailText: string = '';
  private quittanceLocalisation: string = '';
  //Quittance file
  public quittanceDoc: any;
  public pdfFileName: string = "";
  //Main mouvement that will contain the quittance
  public mouvement: Mouvement;
  //Secondary quittances display inside
  public otherMouvements: Mouvement[];
  //Current locataire, bailleur and bien
  public selectedBail: Bail | null;
  public bailPeriodeShort : string;
  public bailPeriodeLong : string;
  public generationDate: Date;
  public quittanceCharges: number;
  public quittanceLoyer: number;
  // Signature image
  public signatureImage: any = '';
  //Various displayed states
  public stepGenerate: number = 0;
  public stepTransfer: number = 0;
  public stepJoint: number = 0;
  public stepMail: number = 0;

  constructor(
    private cdRef: ChangeDetectorRef,
    private route: ActivatedRoute,
    public mailService: MailService,
    public driveService: DriveService,
    public documentService: DocumentService,
    public alertService: AlertService,
    public configurationService: ConfigurationService,
    private location: Location,
    public dialog: MatDialog) { 
      //Get configuration for quittance generation
      this.quittanceMailSujet = this.configurationService.getValue('quittanceMailSujet');
      this.quittanceMailText = this.configurationService.getValue('quittanceMailText');
      this.quittanceLocalisation = this.configurationService.getValue('quittanceLocalisation');
  }

  ngOnInit(): void {
    this.quittanceForm = new FormGroup({
      'bail': new FormControl('', [
        Validators.required
      ]),
      'localisation': new FormControl(this.quittanceLocalisation, [
        Validators.required
      ]),
      'mois': new FormControl(new Date(), [
        Validators.required
      ]),
      'drive': new FormControl(true),
      'mail': new FormControl(true)
    });
    this.getData();

    // Subscribe in case the document was reloaded
    this.documentService.docIsLoadedChange.subscribe((isLoaded: boolean) => {
      if(isLoaded){
        this.getData();
      }
    });
  }
  get bail() { return this.quittanceForm.get('bail'); }
  get localisation() { return this.quittanceForm.get('localisation'); }
  get mois() { return this.quittanceForm.get('mois'); }
  get drive() { return this.quittanceForm.get('drive'); }
  get mail() { return this.quittanceForm.get('mail'); }

  getData(): void {
    //By default no other mouvements
    this.otherMouvements = [];
    //Get parameter id to check if it's new or existing
    const reqMouvementId = this.route.snapshot.paramMap.get('_mouvementid');
    //If an existing one is edited
    if(reqMouvementId == ''){
      this.alertService.error('Aucun mouvement fourni : impossible de générer la quittance !');
      this.goBack();
    }else{
      //Look for the requested mouvement in the list
      for (var _i = 0; _i < this.documentService.document.mouvements.length; _i++) {
        // Find the requested one
        if(this.documentService.document.mouvements[_i].id == reqMouvementId){
          this.mouvement = this.documentService.document.mouvements[_i];
        }
      }
      //A mouvement has been found try now to get the current bail
      if(this.mouvement){

        //By default quittance is for the month corresponding to the mouvement day
        this.quittanceForm.patchValue({mois: this.mouvement.date});

        //A bien is correctly defined in the mouvement
        console.dir(this.mouvement);

        if(this.mouvement.bien){
          var tmpBail: Bail | null = null;
          //Loop for all possible bails and select the accurate one
          for (var _i = 0; _i < this.documentService.document.bails.length; _i++) {
            // Find the requested bien
            if(this.documentService.document.bails[_i].bien == this.mouvement.bien){
              //If the bail has an end date then check if the mouvement date is between begin and end date
              if(this.documentService.document.bails[_i].dateFin){
                if(this.mouvement.date > this.documentService.document.bails[_i].dateDebut && 
                  this.mouvement.date < this.documentService.document.bails[_i].dateFin)
                {
                  tmpBail = this.documentService.document.bails[_i];
                }
              } else{
                if(this.mouvement.date > this.documentService.document.bails[_i].dateDebut)
                {
                  tmpBail = this.documentService.document.bails[_i];
                }
              }
            }
          }

          //If a bail has been found the select it by default
          if(tmpBail){
            this.quittanceForm.patchValue({bail: tmpBail.id});
            // If the locataire is defined in the bail and if the locataire has a mail then proposed to send mail
            if(tmpBail.locataire.mail){
              this.quittanceForm.patchValue({mail: true});
            }else{
              this.quittanceForm.patchValue({mail: false});
            }
          }

        }
      // If the requseted one can not be found (normally impossible) go back;
      }else{
        this.goBack();
        this.alertService.error('Impossible de trouver le mouvement demandé !');
      }
    }
  }

  addMouvementSecondaire(){
    //Display a dialog to add a piece
    const dialogRef = this.dialog.open(MouvementPickDialogComponent, {
      data: {
        multiple: true,
        defaultBien: this.mouvement.bien
      }
    });

    dialogRef.afterClosed().subscribe((result:any) => {
      //If user has choosed a mouvement
      if(result){
        // If one or more
        if(result.length>0){
          //For each file selected
          result.forEach((mouvement:Mouvement) => {
            // Add the new piece in the list of pieces only if it doesn't exist
            if (this.otherMouvements.indexOf(mouvement, 0) == -1 && this.mouvement != mouvement) {
              this.otherMouvements.push(mouvement);
            }
          });
        }
      }
    });
  }

  getTotalMouvements(): number{

    var total: number = 0;
    //First add amount of the main mouvement
    total += this.mouvement.montant;
    //Then add amount of eahc secondary mouvements
    this.otherMouvements.forEach((otherMouvement:Mouvement) => {
      total += otherMouvement.montant;
    });
    //Return final result
    return total;
  }

  closeDatePicker(eventData: any, dp?:any) {
    // get month and year from eventData and close datepicker, thus not allowing user to select date
    dp.close();
    //Update date in the input
    this.quittanceForm.patchValue({mois: eventData});
  }

  public generate(){
    //Reinit selected bail 
    this.selectedBail = null;
    //Get bail from form
    const tmpBail = this.quittanceForm.value.bail;
    //Look for the bail
    for (var _i = 0; _i < this.documentService.document.bails.length; _i++) {
      // Find the requested one
      if(this.documentService.document.bails[_i].id == tmpBail){
        this.selectedBail = this.documentService.document.bails[_i];
      }
    }
    if(this.selectedBail){
      //Reinitialize the quittance file
      this.quittanceDoc = null;
      //Configure steps and action to do
      this.stepGenerate = 0;
      this.stepTransfer = 0;
      this.stepJoint = 0;
      this.stepMail = 0;
      if(this.quittanceForm.value.drive == false){
        this.stepTransfer = -1;
      }
      if(this.quittanceForm.value.mail == false){
        this.stepMail = -1;
      }
      this.stepGenerate = 1;

      //Load bailleur signature form drive (can not use direct url as canvas2html do not support it - CORS pb)
      this.driveService.download(this.selectedBail.bien.proprietaire.signature).then( (response: any) => {
        this.signatureImage = "data:image/png;base64,"+btoa(response.body)
        this.cdRef.detectChanges();
      });

      //Build all required information for quittance generation
      this.computeQuittance();
      //Generate PDF after a moment to let the DOM take into account all modifications (including signature)
      setTimeout(()=>this.generateQuittance(),5000);

    }else{
      this.alertService.error("Aucun bail choisi ou bail inexistant. Impossible de continuer.");
    }
  }

  public computeQuittance(){
    if(this.selectedBail){
      if(this.selectedBail.paiementPeriodicite == 'mensuel'){
        const tmpSelectedMonth = new Date(this.quittanceForm.value.mois);
        this.bailPeriodeShort = MOIS_FR[tmpSelectedMonth.getMonth()] + ' ' +tmpSelectedMonth.getFullYear();
        this.bailPeriodeLong = 'pour le mois de ' + MOIS_FR[tmpSelectedMonth.getMonth()] + ' ' +tmpSelectedMonth.getFullYear();
      }
      this.generationDate = new Date();

      this.quittanceLoyer = this.selectedBail.loyer?this.selectedBail.loyer:0;
      this.quittanceCharges = this.selectedBail.charges?this.selectedBail.charges:0;
    }
  }

  public generateQuittance(){

    //Get canvas width and height
    var w = this.quittance.nativeElement.offsetWidth;
    var h = this.quittance.nativeElement.offsetHeight;

    //Create the PDF file with set properties
    this.quittanceDoc = new jsPDF('p','pt', 'a4');

    //Get selected month
    const tmpSelectedMonth = new Date(this.quittanceForm.value.mois);

    //Compute file name
    this.pdfFileName = (this.selectedBail?this.selectedBail.locataire.nom.replace(/\s/g, ""):'') + "_" +
      (this.selectedBail?this.selectedBail.bien.nom.replace(/\s/g, ""):'') + "_" +
      'Quittance' + "_" +
      tmpSelectedMonth.getFullYear()+"-"+(tmpSelectedMonth.getMonth()+1<10?'0':'') + (tmpSelectedMonth.getMonth()+1) +
      ".pdf";

    //COnvert HTML into canvas (general use because jsPDF is not powerfull enough to get CSS)
    html2canvas(this.quittance.nativeElement, { scale: 3 }).then((canvas: any) => {
      //Get converted HTML in the canvas
      var imgData = canvas.toDataURL('image/png');              
      //Add the canvas in the pdf
      this.quittanceDoc.addImage(imgData, 'JPEG', 40, 40, w-80, h-80, 'alias', 'FAST', 0);

      //Get pdf as a blob
      const blobPdf = this.quittanceDoc.output('blob');
      //Convert blob to file
      const filePdf = new File([blobPdf], this.pdfFileName, { type: "application/pdf", });

      //Step is ended
      this.stepGenerate = 2;

      //Generate is finished send can drive it and send it by mail if user asks for
      if(this.stepTransfer!=-1){this.stepTransfer = 1;}
      if(this.stepMail!=-1){this.stepMail = 1;}

      //Put PDF in the drive if the user request it
      if(this.stepTransfer == 1){
        this.driveService.addFileInDocumentFolder(filePdf).subscribe(
          (response:any) => {
            //OK the file is now in the drive so can enclosed it to the bien
            this.stepTransfer = 2;
            this.stepJoint = 1;
            if(this.selectedBail){
              
              //Now create the file as Piece
              let tmpPiece = new Piece();
              tmpPiece.id = response.id;
              tmpPiece.nom = this.pdfFileName;
              tmpPiece.code = 'BAIL_QUIT';
              tmpPiece.description = "Quittance de " + this.selectedBail.toString() + " pour " + tmpSelectedMonth.getFullYear()+"-"+(tmpSelectedMonth.getMonth()+1<10?'0':'') + (tmpSelectedMonth.getMonth()+1);
              // Add the object in the list of all pieces
              this.documentService.document.pieces.push(tmpPiece);
              //Set the piece as quittance of the mouvement
              this.mouvement.quittance = tmpPiece;
              //And finally add piece in the list of pieces of the Bail
              this.selectedBail.pieces.push(tmpPiece);
              this.stepJoint = 2;
            }else{
              this.stepJoint = 3;
            }
          },
          (error:any) => {
            //Error the fiel can not be placed in the drive
            console.error("Quittance can not be put in the google drive.");
            console.dir(error);
            this.stepTransfer = 3;
          });
        }

        //If user wants, send it directlty bay mail
        if(this.stepMail == 1){
          if(this.selectedBail){
            //Get mail destination
            const locataireMail = this.selectedBail.locataire.mail;
            const bailleurMail = this.selectedBail.bien.proprietaire.mail;
            //Put the period in the mail text
            let mailText = this.quittanceMailText.replace('%%', this.bailPeriodeLong);
            //Add the name of the bailleur
            mailText = mailText + this.selectedBail.bien.proprietaire.nom;
            //Send the mail
            this.mailService.sendMailWithAttachments(this.quittanceMailSujet, mailText, bailleurMail, locataireMail+";"+bailleurMail, [filePdf], 
              (response: any) =>{
                console.dir("Email has been correctly sent !");
                this.stepMail = 2;
                this.cdRef.detectChanges();
              }, 
              (error: any) =>{
                console.error("L'email n'a pas été envoyé !");
                console.dir(error);
                this.alertService.error("L'email n'a pas pu être envoyé !");
                this.stepMail = 3;
                this.cdRef.detectChanges();
              })
          }else{
            this.stepMail = 3;
          }
        }
    });
  }

  public save(){
    //And download it
    this.quittanceDoc.save(this.pdfFileName);
  }
  
  goBack(): void {
    this.location.back();
  }

}
