import { Injectable } from '@angular/core';

import { UserService } from './user.service';
import { AlertService } from '../_services/alert.service';
import { Base64 } from 'js-base64';

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

  constructor(
    public alertService: AlertService,
    public userService: UserService) { 
      console.log("MailService:constructor");
      //By default not loading
      this.isLoading = false;
      // Subscribe to user signin end of prcess so that gmail loading process can begin
      //this.userService.isSignInChange.subscribe((isLoggedIn: boolean) => {
        // If user is logged in then the gmail can be loaded
        //if(isLoggedIn){
          //console.log("MailService:constructor:isLoggedIn " + isLoggedIn);
          this.isLoading = true;
          gapi.client.load('gmail', 'v1', () => {
            //Loading is finished
            this.isLoading = false;
            console.log("MailService:constructor:isLoading " + this.isLoading);
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
    const reader = new FileReader();
    files.forEach((file: File) => {
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
      reader.readAsDataURL(file); 
    });
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
  }


}
