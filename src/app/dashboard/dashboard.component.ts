import { Component, ChangeDetectorRef } from '@angular/core';
import { map } from 'rxjs/operators';
import { BreakpointObserver } from '@angular/cdk/layout';

import { MatDialog} from '@angular/material/dialog';

import { Piece } from '../_modeles/piece';
import { Mouvement } from '../_modeles/mouvement';
import { CompteurValue } from '../_modeles/compteur';
import { AlertService } from '../_services/alert.service';
import { DocumentService } from '../_services/document.service';
import { UserService } from '../_services/user.service';
import { MailComponent } from '../mail/mail.component';
import { MouvementDetailsComponent } from '../mouvement-details/mouvement-details.component';
import { UploadComponent } from '../upload/upload.component';
import { CompteurValueDetailsComponent } from '../compteur-value-details/compteur-value-details.component';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent {
  /** Based on the screen size, switch from standard to one column per row */
  nbCols: any = this.breakpointObserver.observe('(max-width: 1000px)').pipe(
    map(({ matches }) => {
      if (matches) {
        return 1;
      }
      return 2;
    })
  );

  //Whether the list of pissing pieces or warning is big or small (small by default)
  public rowSpanWarn = 2;
  public rowSpanStats = 2;

  constructor(
    public alertService: AlertService,
    private breakpointObserver: BreakpointObserver,
    public documentService: DocumentService,
    public userService: UserService,
    public dialog: MatDialog) {
  }

  addMouvement(): void {
    //Display a confirmation dialog
    const dialogRef = this.dialog.open(MouvementDetailsComponent, {
      data: {
      },
    });

    dialogRef.afterClosed().subscribe((result:any) => {
      //If user confirm creation
      if(result){
        //Add in the global definition
        let tmpNew: Mouvement = Mouvement.fromJSON(result, this.documentService.document.biens, this.documentService.document.pieces);
        tmpNew.id = this.documentService.getUniqueId(4);
        this.documentService.document.mouvements.push(tmpNew);
        this.alertService.success('Le mouvement est maintenant ajouté.');
      // If user finally change his mind
      }else{
        this.alertService.error('L\'ajout a été annulé...');
      }
    });
  }

  public mail(){
    //Display the mail dialog
    this.dialog.open(MailComponent, {
      data: {
        destinataires: '',
        emetteur: this.userService.currentUser.mail,
        sujet: "",
        contenu: "\r\n\r\nCordialement.\r\n"+this.userService.currentUser.nom,
        pieces: []
      },
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
          });
        }
      }
    });
  }

  addCompteurValue(){
    //Display a selection dialog
    const dialogRef = this.dialog.open(CompteurValueDetailsComponent, {
      data: {
        chooseCompteur: true
      }
    });
    //Manage dialog result
    dialogRef.afterClosed().subscribe((result:any) => {
      //If user confirm add
      if(result && result.compteur){
        //Add in the global definition
        let tmpNew: CompteurValue = CompteurValue.fromJSON(result, this.documentService.document.pieces);
        for (let compteur of this.documentService.document.compteurs) {
          if(compteur.id==result.compteur){
            compteur.valeurs.push(tmpNew);
          }
        }
        console.dir(this.documentService.document.compteurs);
        //TODO : gérer la pièce
        this.alertService.success('La nouvelle valeur de compteur est maintenant ajoutée.');
      // If user finally change his mind
      }else{
        this.alertService.error("L'ajout d'une valeur a été annulée...");
      }
    });
  }

}
