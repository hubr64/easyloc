import { Component, OnInit, Input } from '@angular/core';

import { MatDialog} from '@angular/material/dialog';

import { Piece } from '../_modeles/piece';
import { PIECECODE } from '../_modeles/piece';
import { AlertService } from '../_services/alert.service';
import { DocumentService } from '../_services/document.service';
import { EventService } from '../_services/event.service';
import { UploadComponent } from '../upload/upload.component';
import { PiecesChoixComponent } from '../pieces-choix/pieces-choix.component';

@Component({
  selector: 'app-pieces-jointes-details',
  templateUrl: './pieces-jointes-details.component.html',
  styleUrls: ['./pieces-jointes-details.component.scss']
})
export class PiecesJointesDetailsComponent implements OnInit {

  // Component input and output
  @Input() container: any;
  public pieces: Piece[] = [];
  //COnversion of pieces codes into strings
  public pieceCode = PIECECODE;
  // The list of pieces the user wants to remove
  public piecesToRemove: Piece[] = [];

  constructor(
    public dialog: MatDialog,
    public eventService: EventService,
    public documentService: DocumentService) { }

  ngOnInit(): void {
    this.pieces = this.container.pieces;

    //If document is reloaded then get data again and recompute list of mouvements
    this.documentService.docIsLoadedChange.subscribe((isLoaded: boolean) => {
      if(isLoaded){
        this.pieces = this.container.pieces;
      }
    });
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
            }
          });
        }
        //Rebuild completly the list of pieces (to make the setter of FileListComponent works properly)
        this.pieces = [];
        this.container.pieces.forEach((piece: Piece) => {
          this.pieces.push(piece);
        });
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
          });
        }
        //Rebuild completly the list of pieces (to make the setter of FileListComponent works properly)
        this.pieces = [];
        this.container.pieces.forEach((piece: Piece) => {
          this.pieces.push(piece);
        });
      }
    });
  }

  onSelectedRemove(piecesToRemove: Piece[]){
    this.piecesToRemove = piecesToRemove;
  }
  removePieces(){
    //Remove the pieces to the list of pieces
    this.piecesToRemove.forEach((pieceToRemove:Piece) => {
      let index = this.container.pieces.indexOf(pieceToRemove, 0);
      if (index > -1) {
        this.container.pieces.splice(index, 1);
      }
    });
    //Rebuild completly the list of pieces (to make the setter of FileListComponent works properly)
    this.pieces = [];
    this.container.pieces.forEach((piece: Piece) => {
      this.pieces.push(piece);
    });

    //Reset as all pieces are now removed
    this.piecesToRemove = [];
  }

}
