import { Component, ChangeDetectorRef } from '@angular/core';
import { map } from 'rxjs/operators';
import { Breakpoints, BreakpointObserver } from '@angular/cdk/layout';
import { Router } from '@angular/router';

import { MatDialog} from '@angular/material/dialog';

import { TYPEICON } from '../_modeles/easyloc.data';
import { PIECECODE } from '../_modeles/piece';
import { Bail } from '../_modeles/bail';
import { Piece } from '../_modeles/piece';
import { AlertService } from '../_services/alert.service';
import { DocumentService } from '../_services/document.service';
import { UserService } from '../_services/user.service';
import { Mouvement } from '../_modeles/mouvement';
import { MailComponent } from '../mail/mail.component';
import { MouvementDetailsComponent } from '../mouvement-details/mouvement-details.component';
import { UploadComponent } from '../upload/upload.component';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent {
  /** Based on the screen size, switch from standard to one column per row */
  nbCols: any = this.breakpointObserver.observe(Breakpoints.Handset).pipe(
    map(({ matches }) => {
      if (matches) {
        return 1;
      }
      return 2;
    })
  );

  //List of object where pieces are missing
  public missingPieces: any[];
  //Convert object type (locatiare,bien, ..) into icons
  public typeIcon = TYPEICON;
  //Convert piece code to string
  public pieceCode = PIECECODE;
  //Whether the list of pissing pieces or warning is big or small (small by default)
  public rowSpanPieces = 1;
  public rowSpanWarn = 1;
  public rowSpanStats = 2;
  //List of unpaied loyers
  public unpaidLoyers: any[];
  //List of unrent biens
  public unrentBiens: any[];
  //List of bails with loyer to update
  public updateLoyerBails: any[];
  //List of mouvements without quittance
  public mouvementsWithoutQuittance: any[];

  constructor(
    private cdRef: ChangeDetectorRef,
    public alertService: AlertService,
    private breakpointObserver: BreakpointObserver,
    public documentService: DocumentService,
    public userService: UserService,
    private router: Router,
    public dialog: MatDialog) {

    this.documentService.docIsLoadedChange.subscribe((isLoaded: boolean) => {
      if(isLoaded){
        this.loadWarning();
        this.cdRef.detectChanges();
      }
    });
    if(this.documentService.docIsLoaded){
      this.loadWarning();
    }
  }

  private loadWarning(){
    //Get all missing pieces for all objects
    this.missingPieces = this.documentService.checkAllPiecesObligatoires();
    //Get all unpaied loyers
    this.unpaidLoyers = this.documentService.getUnpaiedLoyerForAll();
    //Get all unrent loyers
    this.unrentBiens = this.documentService.getUnrentBienForAll();
    //Get all bails with loyer to update
    this.updateLoyerBails = this.documentService.getLoyerToUpdateForAll();
    //Get all mouvements without quittance
    this.mouvementsWithoutQuittance = this.documentService.getMouvementsWithoutQuittance();
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
    const dialogRef = this.dialog.open(MailComponent, {
      data: {
        destinataires: '',
        emetteur: '',
        sujet: "",
        contenu: "\r\n\r\nCordialement.\r\n"+this.userService.currentUser.nom
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


  getmissingPieceStr(piecesManquantes: string[]): string{
    //Init message
    var missingReturn = piecesManquantes.length + " pièce" + (piecesManquantes.length>1?"s":'') + " : ";
    //Get all missing pieces
    for(let i = 0; i< piecesManquantes.length; i++){
      //If this is a OR missing piece
      for(let j = 0; j< piecesManquantes[i].split("|").length; j++){
        missingReturn = missingReturn + this.pieceCode[piecesManquantes[i].split("|")[j]];
        //Add an "or" if this is the case and if not the last item
        if(j==0 && piecesManquantes[i].split("|").length > 1){missingReturn = missingReturn + " ou ";}
      }
      //Add acoma only if not list item
      if(i<piecesManquantes.length-1 && piecesManquantes.length>1){missingReturn = missingReturn + ", ";}
    }
    //Return builded string
    return missingReturn
  }

  public acquitter(bail:Bail){
    //First step is to create a mouvment
    let tmpMouvement: Mouvement = new Mouvement();
    tmpMouvement.id = this.documentService.getUniqueId(4);
    tmpMouvement.date = new Date();
    tmpMouvement.bien = bail.bien;
    tmpMouvement.libelle = "Loyer de " + bail.toString();
    tmpMouvement.montant = bail.loyer + bail.charges;
    tmpMouvement.tiers = bail.locataire.toString();
    tmpMouvement.commentaires = 'Création depuis le dashboard';
    //Then add the mouvement in the document
    this.documentService.document.mouvements.push(tmpMouvement);
    //Then go to the quittance generation
    setTimeout(()=>{
      this.router.navigate(['/quittance',  tmpMouvement.id])
    },1000);
  }

  public relancer(unpaidLoyer: any){
    //Get current date
    const currentDate = new Date();
    const options = { year: 'numeric', month: 'long', day: '2-digit' } as const;
    const optionsMonth = { year: 'numeric', month: 'long' } as const;
    //Display the mail dialog
    const dialogRef = this.dialog.open(MailComponent, {
      data: {
        destinataires: unpaidLoyer.bail.locataire.mail+";"+unpaidLoyer.bail.bien.proprietaire.mail,
        emetteur: unpaidLoyer.bail.bien.proprietaire.mail,
        sujet: "Relance loyer impayé ("+unpaidLoyer.date.toLocaleDateString('fr-FR',optionsMonth)+")",
        contenu: "Bonjour,\r\n\r\nA ce jour ("+
          currentDate.toLocaleDateString('fr-FR',options)+
          ") et sauf erreur de ma part, je vous rappelle que nous n'avons toujours pas réceptionné votre paiement pour le loyer du mois de "+
          unpaidLoyer.date.toLocaleDateString('fr-FR',optionsMonth)+
          " s’élevant à "+
          (unpaidLoyer.bail.loyer + unpaidLoyer.bail.charges)+
          "€ (charges incluses).\r\n\r\nEn effet, conformément au contrat de location signé le "+
          unpaidLoyer.bail.dateDebut.toLocaleDateString('fr-FR',options)+
          ", l'échéance pour le paiement de votre loyer est fixée au "+
          unpaidLoyer.bail.paiementDate.getDate()+
          " de chaque mois.\r\n\r\nAussi, je vous remercie de procéder au plus vite au règlement de cette échéance afin de régulariser votre situation.\r\n\r\n"+
          "Dans cette attente, je vous prie d’agréer, l’expression de mes sentiments distingués.\r\n"+unpaidLoyer.bail.bien.proprietaire.nom
      },
    });

  }

  public warningCardEmpty(): boolean {

    //We count the number of elements displayed in the warning
    let displayedWarningNb = this.unpaidLoyers.length + this.unrentBiens.length + this.mouvementsWithoutQuittance.length;
    this.updateLoyerBails.forEach(updateLoyerBail => {
      if(updateLoyerBail.toUpdate){
        displayedWarningNb++;
      }
    });
    return displayedWarningNb == 0;
  }

}
