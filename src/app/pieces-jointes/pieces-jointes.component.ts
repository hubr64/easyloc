import { Component, Inject, ChangeDetectorRef } from '@angular/core';
import { MAT_BOTTOM_SHEET_DATA} from '@angular/material/bottom-sheet';
import { MatDialog} from '@angular/material/dialog';

import { DocumentService } from '../_services/document.service';
import { EventService } from '../_services/event.service';
import { DriveService } from '../_services/drive.service';
import { Piece } from '../_modeles/piece';
import { PIECECODE } from '../_modeles/piece';
import { UploadComponent } from '../upload/upload.component';
import { PiecesChoixComponent } from '../pieces-choix/pieces-choix.component';

@Component({
  selector: 'app-pieces-jointes',
  templateUrl: './pieces-jointes.component.html',
  styleUrls: ['./pieces-jointes.component.scss']
})
export class PiecesJointesComponent {

  //Injected data 
  private injectedData: any;
  //List of pieced to display
  public pieces: Piece[] = [];
  //COnversion of pieces codes into strings
  public pieceCode = PIECECODE;
  //URL for each piece
  public urlPieces: {[key: string]: string} = {};
  //404 error for each piece
  public errorPieces: {[key: string]: boolean} = {};
  //Missed pieces beyond mandatary expected pieces
  public missedPieces: string[];
  //Pieces complémentaires à afficher en parallèle des pièces du container
  //Utiles pour les biens associés à des immeubles
  public piecesComplementaires: Piece[];

  constructor(
    @Inject(MAT_BOTTOM_SHEET_DATA) public data: any,
    public driveService: DriveService,
    public documentService: DocumentService,
    public eventService: EventService,
    public dialog: MatDialog,
    private cdr: ChangeDetectorRef
  ) { 
    //Memorize injected data
    this.injectedData = data;
    //Get displayed data
    this.getData();
    //If document is reloaded then get data again
    this.documentService.docIsLoadedChange.subscribe((isLoaded: boolean) => {
      if(isLoaded){
        this.getData();
      }
    });
  }

  public getData(){
    if(this.injectedData.piecesContainer.pieces){
      //Get pieces locally
      this.pieces = this.injectedData.piecesContainer.pieces;
      // For each piece found try to get the link
      this.pieces.forEach((piece:Piece) => {
        this.driveService.get(piece.id).then( 
          (response: any) => {
            this.urlPieces[piece.id] = response.result.webContentLink;
            this.cdr.detectChanges();
          },
          (error:any) => {
            if(error.status==404){
              this.errorPieces[piece.id] = true;
              this.cdr.detectChanges();
            }
            console.error("Impossible to get metadata for " + piece.nom);
          }
        );
      });
    }
    //Get missed pieces for displaying them in the list
    this.missedPieces = this.eventService.checkPiecesObligatoires(this.injectedData.piecesContainer);

    this.piecesComplementaires = [];
    //Si le container est un Bien alors un traitement supplémentaire est à prévoir
    if(this.injectedData.piecesContainer.className=='Bien'){
      //ON recupère l'immeuble du bien
      let bienImmeuble = this.documentService.getImmeuble(this.injectedData.piecesContainer);
      //Si le bien a un immeuble des pièces sont peut être dans l'immeuble (ex : acte de vente ou règlement de Copropriété, ...)
      if(bienImmeuble){
        this.piecesComplementaires = bienImmeuble.pieces;

        // For each piece found try to get the link
        this.piecesComplementaires.forEach((piece:Piece) => {
          this.driveService.get(piece.id).then( 
            (response: any) => {
              this.urlPieces[piece.id] = response.result.webContentLink;
              this.cdr.detectChanges();
            },
            (error:any) => {
              if(error.status==404){
                this.errorPieces[piece.id] = true;
                this.cdr.detectChanges();
              }
              console.error("Impossible to get metadata for " + piece.nom);
            }
          );
        });
      }
    }
  }

  addPiece(){
    //Display a dialog to add a piece
    const dialogRef = this.dialog.open(UploadComponent, {
      data: {
        multiple: true
      }
    });

    dialogRef.afterClosed().subscribe((result:any) => {
      //If user has choosed a file
      if(result){
        // If one or more
        if(result.length>0){
          //For each file selected
          result.forEach((fichier:any) => {
            //Create a temp object
            let tmpPiece = new Piece();
            tmpPiece.id = fichier.fileId;
            tmpPiece.nom = fichier.name;
            tmpPiece.code = fichier.code;
            tmpPiece.description = fichier.name.split('.').slice(0, -1).join('.');
            // Add the object in the list of all pieces
            this.documentService.document.pieces.push(tmpPiece);
            // Add it in the list
            this.pieces.push(tmpPiece);
            //Compute missing pieces once again
            this.missedPieces = this.eventService.checkPiecesObligatoires(this.data.piecesContainer)
          });
        }
      }
    });
  }

  addPieceExisting(){
    //Display a dialog to add a piece
    const dialogRef = this.dialog.open(PiecesChoixComponent, {
      data: {
        multiple: true
      }
    });

    dialogRef.afterClosed().subscribe((result:any) => {
      //If user has choosed a file
      if(result){
        // If one or more
        if(result.length>0){
          //For each file selected
          result.forEach((piece:any) => {
            // Add the new piece in the list of pieces of the container
            if (this.data.piecesContainer.pieces.indexOf(piece, 0) == -1) {
              this.data.piecesContainer.pieces.push(piece);
              //Compute missing pieces once again
              this.missedPieces = this.eventService.checkPiecesObligatoires(this.data.piecesContainer)
            }
          });
        }
      }
    });
  }

  deletePiece(piece:Piece, event: any){
    //Do not propagate click
    event.preventDefault();
    //Remove the piece only in the container and not in e list of pieces
    const indexPiece = this.data.piecesContainer.pieces.indexOf(piece, 0);
    if (indexPiece > -1) {
      this.data.piecesContainer.pieces.splice(indexPiece, 1);
      //Compute missing pieces once again
      this.missedPieces = this.eventService.checkPiecesObligatoires(this.data.piecesContainer)
    }
  }

}
