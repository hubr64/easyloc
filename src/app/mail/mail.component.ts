import { Component, OnInit, Inject } from '@angular/core';
import { MatDialog, MAT_DIALOG_DATA} from '@angular/material/dialog';
import { FormGroup, FormControl, Validators } from '@angular/forms';

import { PiecesChoixComponent } from '../pieces-choix/pieces-choix.component';
import { Piece } from '../_modeles/piece';

import { MailService } from '../_services/mail.service';
import { DriveService } from '../_services/drive.service';
import { AlertService } from '../_services/alert.service';

@Component({
  selector: 'app-mail',
  templateUrl: './mail.component.html',
  styleUrls: ['./mail.component.scss']
})
export class MailComponent implements OnInit {

  //Global form
  public mailForm: FormGroup;
  //LIst of pieces selected but not loaded
  public mailPieces: Piece[];
  //LIst of pieces to send by mail as attachment
  public mailPiecesLoaded: { [key: string]: {piece: Piece, content: any} };

  constructor(
    public dialog: MatDialog,
    public alertService: AlertService,
    public driveService: DriveService,
    public mailService: MailService,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) { 
    this.mailPieces = [];
    this.mailPiecesLoaded = {};
  }

  ngOnInit(): void {
    this.mailForm = new FormGroup({
      'emetteur': new FormControl({ value:this.data.emetteur, disabled: this.data.emetteur!='' }, [
        Validators.required,
        Validators.pattern('[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+')
      ]),
      'destinataires': new FormControl({ value:this.data.destinataires, disabled: false}, [
        Validators.required,
        Validators.pattern('([A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+;*)+')
      ]),
      'sujet': new FormControl(this.data.sujet, [
        Validators.required,
        Validators.minLength(5)
      ]),
      'contenu': new FormControl(this.data.contenu, [
        Validators.required,
        Validators.minLength(5)
      ])
    });
    //Load pieces to prepare sending them
    if(this.data.pieces.length > 0){
      this.downloadPieces(this.data.pieces);
    }
  }

  get emetteur() { return this.mailForm.get('emetteur'); }
  get destinataires() { return this.mailForm.get('destinataires'); }
  get sujet() { return this.mailForm.get('sujet'); }
  get contenu() { return this.mailForm.get('contenu'); }

  public sendMail(){
    //Get all values including disabled fields
    const mailRawValue = this.mailForm.getRawValue();
    if(Object.keys(this.mailPiecesLoaded).length == 0){
      // Send the mail through the send mail service
      this.mailService.sendMail(mailRawValue.sujet, mailRawValue.contenu, mailRawValue.emetteur, mailRawValue.destinataires);
    }else{
      var mailFiles : File[] = [];
      Object.values(this.mailPiecesLoaded).forEach((pieceLoaded: {piece: Piece, content: any}) => {
        mailFiles.push(pieceLoaded.content);
      });
      console.dir(mailFiles);
      this.mailService.sendMailWithAttachments(mailRawValue.sujet, mailRawValue.contenu, mailRawValue.emetteur, mailRawValue.destinataires, mailFiles, 
        (response: any) =>{
          this.alertService.success("L'email a bien été envoyé !");
        }, 
        (error: any) =>{
          console.error("Email has not been sent !");
          console.dir(error);
          this.alertService.error("L'email n'a pas pu être envoyé !");
        });
    }
    // Stop here : if called from a dialog then the dialog will self close
  }

  public attachFile(){

    //Display a dialog to add a piece
    const dialogRef = this.dialog.open(PiecesChoixComponent, {
      data: {
        multiple: true
      }
    });

    dialogRef.afterClosed().subscribe((result:any) => {
      //If user has choosed a file
      if(result){
        // If at least one file selected
        if(result.length > 0){
          this.downloadPieces(result);
        }
      }
    });
  }

  public downloadPieces(pieces:Piece[]){
    //Get file one by one and add them to the list of pieces to send
    pieces.forEach((mailPiece:Piece) => {
      //Check if piece is not already loaded (no use to look for mailPieces as it not possible)
      if(!this.mailPiecesLoaded[mailPiece.id]){
        //Put piece in the list of pieces to load
        this.mailPieces.push(mailPiece);
        //Launch piece loading
        this.driveService.download(mailPiece.id).then( (response: any) => {
          //Convert Piece content to an array buffer (why ?)
          const data = response.body;
          const len = data.length;
          const ar = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            ar[i] = data.charCodeAt(i);
          }
          //Convert array buffer to blob and then to file
          var blobPiece = new Blob([ar], { type: response.headers["Content-Type"] });
          var filePiece = new File([blobPiece], mailPiece.nom, { type: response.headers["Content-Type"] });

          //LOad is finished then put the piece and its content in the list of loaded piece
          this.mailPiecesLoaded[mailPiece.id] = { piece: mailPiece, content: filePiece};
          //Remove it in the list of piece to load
          var index = this.mailPieces.indexOf(mailPiece, 0);
          if (index > -1) {
            this.mailPieces.splice(index, 1);
          }
        });
      }
    });
  }

  public nbFiles(){
    return Object.values(this.mailPiecesLoaded).length + this.mailPieces.length
  }

  public detachFile(pieceToDetach: Piece){
    //Remove from the list of piece to load
    var index = this.mailPieces.indexOf(pieceToDetach, 0);
    if (index > -1) {
      this.mailPieces.splice(index, 1);
    }
    //Remove from the list of piece loaded
    if(this.mailPiecesLoaded[pieceToDetach.id]){
      delete this.mailPiecesLoaded[pieceToDetach.id];
    }
  }

}
