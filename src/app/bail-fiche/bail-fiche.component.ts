import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';

import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTable } from '@angular/material/table';
import { MatTableDataSource} from '@angular/material/table';
import { MatDialog} from '@angular/material/dialog';

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
  //Conversion of types in text
  public bailTermePaiements = bailTermePaiements;
  public bailTypePaiements = bailTypePaiements;
  public bailPeriodePaiements = bailPeriodePaiements;
  // All table elements for mouvements
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatTable) table!: MatTable<Mouvement>;
  public dataSource: MatTableDataSource<Mouvement>;
  public displayedColumns = ['date', 'libelle', 'montant', 'quittance'];
  //All mouvements for the current bien
  public mouvements: Mouvement[];
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
  }

  ngAfterViewInit(): void {
    
    this.mouvements = [];
    for (var _i = 0; _i < this.documentService.document.mouvements.length; _i++) {
      // Find the requested one
      if(this.documentService.document.mouvements[_i].bien.id == this.bail.bien.id && 
        this.documentService.document.mouvements[_i].quittance &&
        this.documentService.document.mouvements[_i].date > this.bail.dateDebut &&
        (!this.bail.dateFin || this.documentService.document.mouvements[_i].date < this.bail.dateFin)
      ){
        this.mouvements.push(this.documentService.document.mouvements[_i]);
      }
    }
    
    // Configure table
    this.dataSource = new MatTableDataSource(this.mouvements);
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
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

  export(){
    //Create the PDF file with set properties
    var ficheDoc = new jsPDF('p','pt', 'a4');

    //Compute file name
    const pdfFileName = "Bail_"+this.bail.bien.nom+"-"+this.bail.locataire.nom+".pdf";

    //COnvert HTML into canvas (general use because jsPDF is not powerfull enough to get CSS)
    html2canvas(this.fiche.nativeElement, { scale: 3 }).then((canvas: any) => {
      //Get converted HTML in the canvas
      var imgData = canvas.toDataURL('image/png');              
      //Add the canvas in the pdf
      ficheDoc.addImage(imgData, 'JPEG', 40, 40, 500, 300, 'alias', 'FAST', 0);

      //Get pdf as a blob
      const blobPdf = ficheDoc.output('blob');
      //Convert blob to file
      const filePdf = new File([blobPdf], pdfFileName, { type: "application/pdf", });

      //And download it
      ficheDoc.save(pdfFileName);
    });

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
