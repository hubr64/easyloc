import { Injectable } from '@angular/core';

import { UserService } from './user.service';
import { AlertService } from '../_services/alert.service';
import { DriveService } from '../_services/drive.service';
import { DocumentService } from '../_services/document.service';
import { CompteurValue } from '../_modeles/compteur';
import { Base64 } from 'js-base64';
import { Piece } from '../_modeles/piece';

declare const gapi: any;

@Injectable({
  providedIn: 'root'
})
export class MailService {

  // The API loading process is ongoing
  public isLoading: boolean;
  // List of destinataires
  public destinataires : string[] = [];
  //Boundary for mail with atachments
  private uploadBoundary = "000000000001981foo_bar_baz";
  //Boolean to only read mail once per sessions
  private readMail: boolean = false;

  constructor(
    public alertService: AlertService,
    public driveService: DriveService,
    public documentService: DocumentService,
    public userService: UserService) { 
      console.log("MailService:constructor");
      //By default loading
      this.isLoading = true;

      // Subscribe in case the document was reloaded
      this.documentService.docIsLoadedChange.subscribe((isLoaded: boolean) => {
        console.log("MailService:constructor : "+ isLoaded);
        if(isLoaded){
            this.load();
        }
      });
      //Compute events if document is already loaded
      if(this.documentService.docIsLoaded){
          setTimeout(()=>this.load(),0);
      }
  }

  private load(){
    //Load gapi client
    gapi.client.load('gmail', 'v1', () => {
      //Loading is finished
      this.isLoading = false;
      console.log("MailService:constructor:isLoading " + this.isLoading);
      //Now read for mails only once a session
      if(!this.readMail){
        this.readEasylocMails();
        this.readMail = true;
      }
    });
  }

  private b64DecodeUnicode(str: any) {
      return decodeURIComponent(Array.prototype.map.call(atob(str), function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
      }).join(''))
  }

  public readEasylocMails(){
    var currentDate = new Date(new Date().setFullYear(new Date().getFullYear() - 1));
    var currentDateStr = currentDate.getFullYear()+"/"+(currentDate.getMonth()+1)+"/"+currentDate.getDate();
    //First list all unred message since last year with title containing easyloc
    console.log("Start mail synchronisation...");
    gapi.client.gmail.users.messages.list({
      'userId': 'me',
      'q': 'is:unread after:'+currentDateStr+' subject:easyloc'
    }).execute( (messagesListRes:any) => {
      if(messagesListRes.messages){
        console.log(messagesListRes.messages.length + " message(s) to synchronize.");
        //For each message of the messages list, get the content
        messagesListRes.messages.forEach((message:any) => {
          gapi.client.gmail.users.messages.get({
            'userId': 'me',
            'id': message.id
          }).execute( (messageGetRes:any) => {
            //Get all the parts of the mail content
            var mailParts = messageGetRes.payload.parts;
            console.dir(messageGetRes);
            //If there are more than one part (the cbody and at least one piece)
            if(mailParts.length>1){
              //Get mail body
              var mailBody = mailParts[0];
              //If this a multipart body (with attachments)
              if(mailBody.mimeType == "multipart/alternative" && mailBody.parts.length>0){
                console.log("Multipart mail with attachments");
                //Get the first part body which should be the text plain part
                mailBody = mailBody.parts[0].body
                //Convert base64 string to classic string
                mailBody = this.b64DecodeUnicode(mailBody.data);
              }
              //If this a plaintext body (without attachment)
              if(mailBody.mimeType == "text/plain"){
                console.log("Plain text mail without attachments");
                //Get the first part body which should be the text plain part
                mailBody = mailBody.body
                //Convert base64 string to classic string
                mailBody = this.b64DecodeUnicode(mailBody.data);
              }
  
              //Get mail attachments (just remove the body part at the beginning)
              mailParts.shift();
              var mailAttachments = mailParts;
              //Now manage each attachment
              console.log(mailAttachments.length + " piece(s) to synchronize.");
              mailAttachments.forEach((mailAttachment:any) => {
                //If the attachment has a body and inside it an attachment id then can continue
                if(mailAttachment.body && mailAttachment.body.attachmentId){
                  //Get this attachment base on its id and parent message id
                  console.log("Chargement de la pièce...");
                  gapi.client.gmail.users.messages.attachments.get({
                    'userId': 'me',
                    'messageId': message.id,
                    'id': mailAttachment.body.attachmentId
                  }).execute( (attachmentGetRes:any) => {
                    //Neccesary base string cleaning for the attachment (why ?)
                    let dataBase64Rep = attachmentGetRes.data.replace(/-/g, '+').replace(/_/g, '/')
                    //Convert base64 string to classic string
                    const data = atob(dataBase64Rep);
                    //Convert classic string to array buffer
                    const len = data.length;
                    const ar = new Uint8Array(len);
                    for (let i = 0; i < len; i++) {
                      ar[i] = data.charCodeAt(i);
                    }
                    //Convert array buffer to blob then to file
                    const blobPiece = new Blob([ar], {type: mailAttachment.mimeType});
                    const filePiece = new File([blobPiece], mailAttachment.filename, { type: mailAttachment.mimeType });

                    console.log("Conversion en fichier terminée et envoi dans le Drive");

                    //Add this file to the drive easyloc folder
                    this.driveService.addFileInDocumentFolder(filePiece).subscribe(
                      (response:any) => {
                        console.log("Piece stockée dans le fichier drive " + response.id);
                        //If import succeed then creat a new piece base on the file Id on the drive
                        let tmpPiece = new Piece();
                        tmpPiece.id = response.id;
                        tmpPiece.nom = mailAttachment.filename;
                        tmpPiece.code = 'DIVERS';
                        tmpPiece.description = mailAttachment.filename + " (reçu par mail)";
                        //Add piece to document
                        this.documentService.document.pieces.push(tmpPiece);
                        //Inform user that a new piece is now retreived
                        this.alertService.success("Une nouvelle pièce a été importée par mail ("+mailAttachment.filename+").")

                        //Now try to link the piece with an object
                        if(mailBody && mailBody!=''){
                          //Explode the body to get container information
                          var pieceContainer: string[] = mailBody.trim().split(":");
                          //Container must be defined with at least two informations
                          if(pieceContainer.length==2){
                            if(pieceContainer[0].trim().toLowerCase()=="bien"){
                              console.log("Mail attachment is for bien.");
                              this.documentService.document.biens.forEach((bien:any) => {
                                if(bien.nom.toLowerCase().indexOf(pieceContainer[1].trim().toLowerCase()) !== -1){
                                  bien.pieces.push(tmpPiece);
                                }
                              });
                            }
                            if(pieceContainer[0].trim().toLowerCase()=="locataire"){
                              console.log("Mail attachment is for locataire.");
                              this.documentService.document.locataires.forEach((locataire:any) => {
                                if(locataire.nom.toLowerCase().indexOf(pieceContainer[1].trim().toLowerCase()) !== -1){
                                  locataire.pieces.push(tmpPiece);
                                }
                              });
                            }
                            if(pieceContainer[0].trim().toLowerCase()=="bail"){
                              console.log("Mail attachment is for bail.");
                              this.documentService.document.bails.forEach((bail:any) => {
                                if(bail.locataire.nom.toLowerCase().indexOf(pieceContainer[1].trim().toLowerCase()) !== -1){
                                  bail.pieces.push(tmpPiece);
                                }
                              });
                            }
                            if(pieceContainer[0].trim().toLowerCase()=="bailleur"){
                              console.log("Mail attachment is for bailleur.");
                              this.documentService.document.bailleurs.forEach((bailleur:any) => {
                                if(bailleur.nom.toLowerCase().indexOf(pieceContainer[1].trim().toLowerCase()) !== -1){
                                  bailleur.pieces.push(tmpPiece);
                                }
                              });
                            }
                          }
                          if(pieceContainer.length==4){
                            if(pieceContainer[0].trim().toLowerCase()=="compteur"){
                              console.log("Mail attachment is for compteur.");
                              this.documentService.document.compteurs.forEach((compteur:any) => {
                                if(compteur.bien.nom.toLowerCase().indexOf(pieceContainer[1].trim().toLowerCase()) !== -1 && 
                                  compteur.designation.toLowerCase().indexOf(pieceContainer[2].trim().toLowerCase()) !== -1){
                                    var compteurValueMail = parseFloat(pieceContainer[3]);
                                    if(compteurValueMail){
                                      let compteurValueNew: CompteurValue = new CompteurValue();
                                      compteurValueNew.dateReleve = new Date();
                                      compteurValueNew.valeur = compteurValueMail;
                                      compteurValueNew.preuve = tmpPiece;
                                      compteurValueNew.commentaires = "Reçu par mail"
                                      compteur.valeurs.push(compteurValueNew);
                                      tmpPiece.description = compteur.bien.nom + " - Preuve compteur - " + compteur.designation;
                                    }
                                }
                              });
                            }
                          }
                        }

                        //Remove read status of the mail
                        gapi.client.gmail.users.messages.modify({
                          'userId':'me',
                          'id':message.id,
                          'resource': {
                              'addLabelIds':[],
                              'removeLabelIds': ['UNREAD']
                          }
                        }).execute( (messageModifyRes:any) => {
                          console.log("UNREAD label is now removed.");
                        });
                      },
                      (error:any) => {
                      });
                  });
                }else{
                  if(mailAttachment.body){
                    if(mailBody && mailBody!=''){

                      //Explode the body to get container information
                      var pieceContainer: string[] = mailBody.trim().split(":");

                      if(pieceContainer.length==4){
                        if(pieceContainer[0].trim().toLowerCase()=="compteur"){
                          this.documentService.document.compteurs.forEach((compteur:any) => {
                            if(compteur.bien.nom.toLowerCase().indexOf(pieceContainer[1].trim().toLowerCase()) !== -1 && 
                              compteur.designation.toLowerCase().indexOf(pieceContainer[2].trim().toLowerCase()) !== -1){
                                var compteurValueMail = parseFloat(pieceContainer[3]);
                                if(compteurValueMail){
                                  let compteurValueNew: CompteurValue = new CompteurValue();
                                  compteurValueNew.dateReleve = new Date();
                                  compteurValueNew.valeur = compteurValueMail;
                                  compteurValueNew.commentaires = "Reçu par mail"
                                  compteur.valeurs.push(compteurValueNew);
                                }
                            }
                          });
                        }
                      }

                      //Remove read status of the mail
                      gapi.client.gmail.users.messages.modify({
                        'userId':'me',
                        'id':message.id,
                        'resource': {
                            'addLabelIds':[],
                            'removeLabelIds': ['UNREAD']
                        }
                      }).execute( (messageModifyRes:any) => {
                        console.log("UNREAD label is now removed.");
                      });
                    }
                  }
                }
              });
            }
          });
        });
      }else{
        console.log("No email to import.");
      }
    });
  }

  public sendMail(sujet: string, contenu: string, emetteur: string, destinataires: string){

    //Convert destinaires in an array
    const destArr = destinataires.split(";");

    //Build the data to send in an array...
    const mimeData = [];
    mimeData.push("From: "+emetteur);
    destArr.forEach((destinataire: string) => {
      mimeData.push("To: "+destinataire);
    });
    mimeData.push("Subject: =?utf-8?B?" + window.btoa(unescape(encodeURIComponent(sujet))) + "?=");
    mimeData.push("MIME-Version: 1.0");
    mimeData.push("Content-Type: text/plain; charset=UTF-8");
    mimeData.push("Content-Transfer-Encoding: 7bit");
    mimeData.push("");
    mimeData.push(contenu);
    //...then convert into string
    const mimeDataStr = mimeData.join("\n").trim();

    const raw = window.btoa(unescape(encodeURIComponent(mimeDataStr))).replace(/\+/g, '-').replace(/\//g, '_');
    //We can only send mails if the user is connected otherwise nothing will be possible
    if(this.userService.isSignIn){
      if(this.isLoading == false){
        gapi.client.gmail.users.messages.send({
          'userId': 'me',
          'resource': {
            'raw': raw
          }
        }).execute( (res:any) => {
          console.log('Email sent', res);
          this.alertService.success("L'email a bien été envoyé !");
        });
      }
    }
  }

  public sendMailWithAttachments(sujet: string, contenu: string, emetteur: string, destinataires: string, files: File[], processResponse: any, processError: any){

    //Convert destinaires in an array
    const destArr = destinataires.split(";");

    //Build the data to send in an array...
    const mimeData: string[] = [];
    //FIrst add global information on the mail
    mimeData.push('Content-Type: multipart/mixed; boundary="'+this.uploadBoundary+'"');
    mimeData.push("MIME-Version: 1.0");
    mimeData.push("From: "+emetteur);
    destArr.forEach((destinataire: string) => {
      mimeData.push("To: "+destinataire);
    });
    mimeData.push("Subject: " + sujet);
    //Then add the mail content
    mimeData.push("");
    mimeData.push("--" + this.uploadBoundary);    
    mimeData.push("Content-Type: text/plain; charset=UTF-8");
    mimeData.push("Content-Transfer-Encoding: 7bit");
    mimeData.push("");
    mimeData.push(contenu);
    mimeData.push("");
    mimeData.push("--" + this.uploadBoundary);
    //Add each file to the content as base64
    files.forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event: any) => {
        mimeData.push('Content-Type: '+file.type+'; name="'+file.name+'"');
        mimeData.push('Content-Transfer-Encoding: base64');
        mimeData.push('Content-Disposition: attachment; filename="'+file.name+'"');
        mimeData.push("");
        var fileData = event.target.result.split('base64,')[1];
        mimeData.push(fileData);
        mimeData.push("");
        mimeData.push("--" + this.uploadBoundary);
      };
      //When all files are loaded the finalize to send the mail
      reader.onloadend = (event: any) => {
        //Convert array into string
        const mimeDataStr = mimeData.join("\r\n").trim();
        //We can only send mails if the user is connected otherwise nothing will be possible
        if(this.userService.isSignIn){
          if(this.isLoading == false){
            gapi.client.gmail.users.messages.send({
              'userId': 'me',
              'resource': {
                'raw': Base64.encodeURI(mimeDataStr)
              }
            }).then((response: any) => {
              processResponse(response);
            }, (reason: any) => {
              processError(reason);
            });
          }
        }
      }
      reader.readAsDataURL(file); 
    });
    
  }


}
