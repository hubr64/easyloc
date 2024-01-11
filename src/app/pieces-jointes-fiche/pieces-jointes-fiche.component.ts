import { Component, OnInit, Input, ChangeDetectorRef } from '@angular/core';

import { MatDialog} from '@angular/material/dialog';

import { Piece } from '../_modeles/piece';
import { PIECECODE } from '../_modeles/piece';
import { DriveService } from '../_services/drive.service';
import { DocumentService } from '../_services/document.service';
import { UploadComponent } from '../upload/upload.component';
import { PiecesChoixComponent } from '../pieces-choix/pieces-choix.component';

@Component({
  selector: 'app-pieces-jointes-fiche',
  templateUrl: './pieces-jointes-fiche.component.html',
  styleUrls: ['./pieces-jointes-fiche.component.scss']
})
export class PiecesJointesFicheComponent implements OnInit {

  // COmponent input and output
  @Input() container: any;
  @Input() piecesObligatoires: string;
  @Input() pieceSpecific: string;
  //Conversion of pieces codes into strings
  public pieceCode = PIECECODE;
  //URL for download each piece
  public urlPieces: {[key: string]: string} = {};
  //Thumbnail for each piece
  public thumbPieces: {[key: string]: string} = {};
  //Icon for each piece
  public iconPieces: {[key: string]: string} = {};
  //Error for each piece
  public errorPieces: {[key: string]: boolean} = {};
  //Pieces grouped by category
  public mandatoryPieces: Piece[] = [];
  public specificPieces: Piece[] = [];
  public otherPieces: Piece[] = [];
  //Pieces complémentaires à afficher en parallèle des pièces du container
  //Utiles pour les biens associés à des immeubles
  public piecesComplementaires: Piece[];

  constructor(
    public dialog: MatDialog,
    public driveService: DriveService,
    public documentService: DocumentService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {

    //Compute list of pieces
    this.getData();

    //If document is reloaded then get data again and recompute list of pieces
    this.documentService.docIsLoadedChange.subscribe((isLoaded: boolean) => {
      if(isLoaded){
          this.getData();
      }
    });
  }

  public getData(){
    this.mandatoryPieces = [];
    this.specificPieces = [];
    this.otherPieces = [];
    this.piecesComplementaires = [];

    //Si le container est un Bien alors un traitement supplémentaire est à prévoir
    if(this.container.className=='Bien'){
      //ON recupère l'immeuble du bien
      let bienImmeuble = this.documentService.getImmeuble(this.container);
      //Si le bien a un immeuble des pièces sont peut être dans l'immeuble (ex : acte de vente ou règlement de Copropriété, ...)
      if(bienImmeuble){
        this.piecesComplementaires = bienImmeuble.pieces;
      }
    }

    //ON construit un tableau à partir de toutes les pièces
    let allPieces = this.container.pieces.concat(this.piecesComplementaires)

    //Get all pieces information
    allPieces.forEach((piece:Piece) => {

      if(this.piecesObligatoires.indexOf(piece.code) != -1 ){
        this.mandatoryPieces.push(piece);
      }else{
        if(this.pieceSpecific && this.pieceSpecific.indexOf(piece.code) != -1 ){
          this.specificPieces.push(piece);
        }else{
          this.otherPieces.push(piece);
        }
      }

      this.driveService.get(piece.id).then( 
        (response: any) => {
          this.urlPieces[piece.id] = response.result.webContentLink;
          this.thumbPieces[piece.id] = response.result.thumbnailLink;
          this.iconPieces[piece.id] = response.result.iconLink;
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

    //Si le container
  }

  addPieces(){
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
            // Add the new piece in the list of pieces only if it doesn't exist
            if (this.container.pieces.indexOf(piece, 0) == -1) {
              this.container.pieces.push(piece);
              this.ngOnInit();
            }
          });
        }
      }
    });
  }

  uploadPieces(){
    //Display a dialog to add a piece
    const dialogRef = this.dialog.open(UploadComponent, {
      data: {
        multiple: true // Multiple files possible
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
            // Add the new piece in the list of pieces of the container
            this.container.pieces.push(tmpPiece);
            this.ngOnInit();
          });
        }
      }
    });
  }

}
