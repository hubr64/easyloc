import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Location } from '@angular/common';
import { FormControl } from '@angular/forms';

import { AlertService } from '../_services/alert.service';
import { DriveService } from '../_services/drive.service';
import { DocumentService } from '../_services/document.service';
import { ConfigurationService } from '../_services/configuration.service';
import { Bail } from '../_modeles/bail';
import { Bien } from '../_modeles/bien';
import { Piece } from '../_modeles/piece';

@Component({
  selector: 'app-bail-new',
  templateUrl: './bail-new.component.html',
  styleUrls: ['./bail-new.component.scss']
})
export class BailNewComponent implements OnInit {

  public bienALouer: Bien;
  public bienControl = new FormControl('');
  public annoncesBien: Piece[];
  public bailsBien: Piece[];
  public bailsAnnexesBien: Piece[];
  public photosBien: Piece[];
  public etatSortantBien: Piece[];

  public modelesAnnonce: Piece[];
  public modelesLocataire: Piece[];
  public modelesBail: Piece[];
  public modelesBailAnnexe: Piece[];

  //URL for download each piece
  public urlPieces: {[key: string]: string} = {};
  //Thumbnail for each piece
  public thumbPieces: {[key: string]: string} = {};
  //Icon for each piece
  public iconPieces: {[key: string]: string} = {};
  //Error for each piece
  public errorPieces: {[key: string]: boolean} = {};
  
  constructor(
    public alertService: AlertService,
    public documentService: DocumentService,
    public driveService: DriveService,
    public configurationService: ConfigurationService,
    private location: Location,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {

    this.modelesAnnonce = [];
    this.modelesLocataire = [];
    this.modelesBail = [];
    this.modelesBailAnnexe = [];

    this.documentService.document.pieces.forEach((piece:Piece) => {
      if(piece.description.toLowerCase().indexOf("modèle") !== -1 && piece.code == "BIEN_ANNO"){
        this.modelesAnnonce.push(piece);
        this.getPieceFromDrive(piece);
      }
      if(piece.description.toLowerCase().indexOf("modèle lettre futur locataire") !== -1 ||
      piece.description.toLowerCase().indexOf("liste des réparations locatives") !== -1 ||
      piece.description.toLowerCase().indexOf("liste des charges récupérables") !== -1){
        this.modelesLocataire.push(piece);
        this.getPieceFromDrive(piece);
      }
      if(piece.description.toLowerCase().indexOf("modèle bail") !== -1 && piece.code == "BAIL_CONT"){
        this.modelesBail.push(piece);
        this.getPieceFromDrive(piece);
      }
      if(piece.description.toLowerCase().indexOf("modèle notice d'information") !== -1 ||
      piece.description.toLowerCase().indexOf("modèle acte de cautionnement simple ou solidaire") !== -1 ||
      piece.description.toLowerCase().indexOf("modèle etat des lieux") !== -1){
        this.modelesBailAnnexe.push(piece);
        this.getPieceFromDrive(piece);
      }
    });

    //Listen for filter change
    this.fieldListener();
  }

  private fieldListener() {
    this.bienControl.valueChanges.subscribe((bienId:string | null) => {
      if(bienId){
        this.documentService.document.biens.forEach((bien:Bien) => {
          if(bien.id == bienId){
            this.bienALouer = bien;
          }
        });
        this.searchAnnonceForBienALouer();
      }
    });
  }

  private searchAnnonceForBienALouer(){

    this.annoncesBien = [];
    this.bailsBien = [];
    this.photosBien = [];
    this.bailsAnnexesBien = [];
    this.etatSortantBien = [];

    if(this.bienALouer){
      this.bienALouer.pieces.forEach((piece:Piece) => {
        if(piece.code == "BIEN_ANNO"){
          this.annoncesBien.push(piece);
          this.getPieceFromDrive(piece);
        }
        if(piece.code == "BIEN_PHOT"){
          this.photosBien.push(piece);
          this.getPieceFromDrive(piece);
        }
        if(piece.code == "BAIL_CONT"){
          this.bailsBien.push(piece);
          this.getPieceFromDrive(piece);
        }
        if(piece.code == "BAIL_STV" || piece.code == "BIEN_DIAG" || piece.code == "BIEN_REGL"){
          this.bailsAnnexesBien.push(piece);
          this.getPieceFromDrive(piece);
        }
      });

      var tmpBail: Bail | null = null;
      //LOf for all possible bails and select the accurate one
      for (var _i = 0; _i < this.documentService.document.bails.length; _i++) {
        // Find the requested bien
        if(this.documentService.document.bails[_i].bien == this.bienALouer){
          //If the bail has an end date (bail finish) and if a bail is already selected
          if(this.documentService.document.bails[_i].dateFin && tmpBail){
            //If the bail is later then the already selected
            if(this.documentService.document.bails[_i].dateFin > tmpBail.dateFin){
              tmpBail = this.documentService.document.bails[_i];
            }
          //No bail is selected of bail has no end date (current bail on the bien)  
          }else{
            tmpBail = this.documentService.document.bails[_i];
            break;
          }
        }
      }
      if(tmpBail){
        tmpBail.pieces.forEach((piece:Piece) => {
          if(piece.code == "BAIL_STE"){
            this.etatSortantBien.push(piece);
            this.getPieceFromDrive(piece);
          }
        });
      }
    }
  }

  private getPieceFromDrive(piece:Piece){
    if(!this.urlPieces[piece.id] && !this.errorPieces[piece.id]){
      this.driveService.get(piece.id).then( 
        (response: any) => {
          this.urlPieces[piece.id] = response.result.webContentLink;
          this.thumbPieces[piece.id] = response.result.thumbnailLink;
          this.iconPieces[piece.id] = response.result.iconLink;
          this.cdr.detectChanges();
        },
        (error:any) => {
          if(error.status==404 || error.status==403){
            this.errorPieces[piece.id] = true;
            this.cdr.detectChanges();
          }
          console.error("Impossible to get metadata for " + piece.nom);
        }
      );
    }
  }

  goBack(): void {
    this.location.back();
  }

}
