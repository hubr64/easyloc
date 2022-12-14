import { Injectable , Output, EventEmitter, ApplicationRef} from '@angular/core';
import { Subject } from 'rxjs';

import { MatDialog} from '@angular/material/dialog';

import { DriveService } from './drive.service';
import { AlertService } from './alert.service';
import { ConfigurationService } from './configuration.service';
import { EasylocData } from '../_modeles/easyloc.data';
import { Locataire } from '../_modeles/locataire';
import { Bailleur, BailleurType } from '../_modeles/bailleur';
import { Bien } from '../_modeles/bien';
import { Piece } from '../_modeles/piece';
import { Bail } from '../_modeles/bail';
import { Mouvement } from '../_modeles/mouvement';
import { BailleurListeComponent } from '../bailleur-liste/bailleur-liste.component';
import { DialogReloadComponent } from '../dialog-reload/dialog-reload.component';

declare const gapi: any;

@Injectable({
  providedIn: 'root'
})
export class DocumentService {

  //Document containing all informations (not the configuration)
  public document: EasylocData;
  // Variables used to know if the document has been initialy loaded from the drive
  public docIsLoaded: boolean;
  public docIsLoadedChange: Subject<boolean> = new Subject<boolean>();
  // The loading process is ongoing
  public isLoading: boolean;
  // Variables used to track document modifications that need to be saved
  public oldDocument = '';
  public docIsModified: boolean = false;
  public autoSave: boolean = false;
  private autoSaveDuration: number = 1;
  // Variables used to track document synchronisation with server
  private autoSyncExecution: boolean = false;
  private autoSyncDuration: number = 1;
  //Watchers
  private watchSyncId: any;
  private watchModifId: any;

  constructor(
    private ref: ApplicationRef,
    public dialog: MatDialog,
    public driveService: DriveService,
    public alertService: AlertService,
    public configurationService: ConfigurationService
  ) { 

    //By default the document is necessarly not loaded
    this.docIsLoaded = false;
    this.docIsLoadedChange.subscribe((value: boolean) => {
        this.docIsLoaded = value
    });
    this.docIsLoadedChange.next(false);

    //Retrieve configuration from service
    this.autoSaveDuration = parseInt(this.configurationService.getValue('autoSaveDuration'));
    this.autoSave = (this.configurationService.getValue('autoSave')==true || this.configurationService.getValue('autoSave')=="true") ;
    this.autoSyncDuration = parseInt(this.configurationService.getValue('autoSyncDuration'));
    this.autoSyncExecution = false;
    // By default the document is not loading as we wait for the drive to be ready
    this.isLoading = false;
    //Load the document from the drive as soon as it is available
    this.driveService.driveIsCompliantChange.subscribe((isCompliant: boolean) => {
      console.log("DocumentService:constructor : "+ isCompliant);
      if(isCompliant){
        this.load();
      }else{
        this.closeDocument();
      }
    });
    // If the drive is compliant directly then load right now
    if(this.driveService.driveIsCompliant){
      this.load();
    }
  }

  public load(reloadVersion: number = -1){

    if(reloadVersion!=-1){
      //console.dir(this.document);
      //First indicate that the document has to be loaded
      this.docIsLoadedChange.next(false);
    }
    //Indicate that we load
    this.isLoading = true;
    //Data can be loaded only if the drive is compliant
    if(this.driveService.driveIsCompliant){
      this.driveService.download(this.driveService.dataFileId).then( (response: any) => {
        //Transform JSON file into data locally
        this.document = EasylocData.fromJSON(response.result);
        //console.dir(this.document);
        //If this is a version reload then refresh the version of the file
        if(reloadVersion!=-1){
          this.driveService.dataFileVersion = reloadVersion;
        }
        console.log("Document version "+this.driveService.dataFileVersion+" is loaded");
        this.isLoading = false;
        this.docIsLoadedChange.next(true);
        //Memorize the document for modification tracking change
        this.oldDocument = JSON.stringify(this.document.toJSON());
        this.docIsModified = false;
        // Launch modification tracking change function if first load only
        if(reloadVersion==-1){
          this.watchSyncId = setInterval(() => this.watchDocumentSync(), this.autoSyncDuration * 1000);
          this.watchModifId = setInterval(() => this.watchDocumentModification(), this.autoSaveDuration * 1000);
        }
      });
    }else{
      // If drive is not compliant we are not loading
      this.isLoading = false;
      
    }
  }

  public closeDocument(){

    console.log("DocumentService:closeDocument");
    this.document = new EasylocData();

    if(this.watchSyncId){
      console.log("DocumentService:clearInterval:watchSyncId "+this.watchSyncId);
      clearInterval(this.watchSyncId)
    }
    if(this.watchModifId){
      console.log("DocumentService:clearInterval:watchModifId "+this.watchModifId);
      clearInterval(this.watchModifId)
    }

  }

  public saveDocumentFile(){
    //First check if a more recent file existe on the server (which is not good)
    this.driveService.get(this.driveService.dataFileId).then( 
      (response: any) => {
        if(response && response.result && response.result.version && this.driveService.dataFileVersion == response.result.version){
          this.docIsLoadedChange.next(false);
          //Prevent sync to be executed otherwise save and sync may interfer
          this.autoSyncExecution = true;
          console.dir("File is the last version. Save can be executed");
          //Document is converted in a JSON string
          const documentJson = JSON.stringify(this.document.toJSON());
          //Save document throught the drive service
          this.driveService.upload(this.driveService.dataFileId, this.driveService.dataFileName, documentJson).subscribe(
            (response:any) => {
              console.log('Modification saved.');
              this.docIsModified = false;
              this.docIsLoadedChange.next(true);

              //Now that document is updated get the new version
              this.driveService.get(this.driveService.dataFileId).then( 
                (response: any) => {
                  if(response && response.result && response.result.version){
                    this.driveService.dataFileVersion = response.result.version;
                    //Autosync can now be executed again
                    this.autoSyncExecution = false;
                  }
                },
                (error:any) => {
                  console.error('New version can not be loaded after save : ');
                  console.dir(error);
                  //Autosync can now be executed again
                  this.autoSyncExecution = false;
                }
              );
            },
            (error:any) => {
              this.alertService.error("Impossible de sauvegarder le document. Veuillez v??rifier votre connexion.");
              console.error('Modification not saved : ');
              console.dir(error);
              //Autosync can now be executed again
              this.autoSyncExecution = false;
            });
        }else{
          //Problem of version : version on server is more recent then ask user what to do
          const dialogRef = this.dialog.open(DialogReloadComponent, {
            data: {
              lastVersion: response.result.version,
            }
          });
          this.ref.tick();
         
          //Catch user answer
          dialogRef.afterClosed().subscribe((result:boolean) => {
            //User wants to reload
            if(result){
              this.load(response.result.version);
              this.ref.tick();
            }else{
              console.log("User wants to keep current version.")
            }
          });
        }
      },
      (error: any) => {
        console.error("Impossible to get data file version.");
        console.dir(error);
      }
    );
  }

  private watchDocumentSync(){
    //Do not sync if a sync is in execution
    if(this.autoSyncExecution == false){
      //A sync is in execution
      this.autoSyncExecution = true;
      // If there is a document and if the drive is compliant
      if (this.document && this.driveService.driveIsCompliant && this.driveService.dataFileVersion) {
        //Check if a more recent file existe on the server (which may be a problem)
        this.driveService.get(this.driveService.dataFileId).then( 
          (response: any) => {
            if(response && response.result && response.result.version && response.result.version > this.driveService.dataFileVersion){
              console.dir("File is not the last version. Reload should be proposed");
              //New version on server then ask user what to do
              const dialogRef = this.dialog.open(DialogReloadComponent, {
                data: {
                  lastVersion: response.result.version,
                }
              });
              this.ref.tick();
            
              //Catch user answer
              dialogRef.afterClosed().subscribe((result:boolean) => {
                //User wants to reload
                if(result){
                  this.load(response.result.version);
                  this.ref.tick();
                }else{
                  console.log("User wants to keep current version.")
                }
                this.autoSyncExecution = false;
              });
            }else{
              this.autoSyncExecution = false;
            }
          },
          (error: any) => {
            console.error("Impossible to get data file version.");
            console.dir(error);
            this.autoSyncExecution = false;
          }
        );
      }else{
        this.autoSyncExecution = false;
      }
    }
  }

  private watchDocumentModification() {

    // If there is a document and if the drive is compliant
    if (this.document && this.driveService.driveIsCompliant) {

      // Convert to JSON to prevent shadow copy
      let currentDocument = JSON.stringify(this.document.toJSON());

      // Remove the modification date and author that is by definition not to take into account
      const modificationDateRegex = /,"modificationDate":"[^"]*"/gi; // ,"modificationDate":"2020-01-15T17:05:12.362Z",
      currentDocument = currentDocument.replace(modificationDateRegex, '');
      this.oldDocument = this.oldDocument.replace(modificationDateRegex, '');
      const modificationByRegex = /,"modifiedBy":"[^"]*"/gi; // ,"modifiedBy":"Hubert Martin-Deidier",
      currentDocument = currentDocument.replace(modificationByRegex, '');
      this.oldDocument = this.oldDocument.replace(modificationByRegex, '');

      // If the deep copies are different then it means there is a modification
      if (currentDocument !== this.oldDocument) {
        console.log('Modification d??tect??e.');
        setTimeout(() => {
          this.docIsModified = true;
        });
        //IF user wants autosave then modification is saved automatically and no message is display
        if(this.autoSave){
          this.saveDocumentFile();
        }
        // Memorize modification for future comparison
        this.oldDocument = currentDocument;
      }
    }
  }

  public getUniqueId(parts: number): string {
    const stringArr = [];
    for(let i = 0; i< parts; i++){
      // tslint:disable-next-line:no-bitwise
      const S4 = (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
      stringArr.push(S4);
    }
    return stringArr.join('-');
  }

  public checkLocataire(locataireToCheck: any, displayError: boolean = false){
    var tmpLocataire = Locataire.fromJSON(locataireToCheck)
    if(tmpLocataire){
      for (var _i = 0; _i < this.document.locataires.length; _i++) {
        if(this.document.locataires[_i].nom == tmpLocataire.nom){
          if(displayError){
            this.alertService.error("Un locataire existe d??j?? avec ce nom...");
          }
          return false;
        }
      }
    }else{
      if(displayError){
        this.alertService.error("Impossible de cr??er ce locataire...");
      }
      return false;
    }
    return true;
  }

  public checkBailleur(toCheck: any, displayError: boolean = false){
    var tmpToCheck = Bailleur.fromJSON(toCheck)
    if(tmpToCheck){
      for (var _i = 0; _i < this.document.bailleurs.length; _i++) {
        if(this.document.bailleurs[_i].nom == tmpToCheck.nom){
          if(displayError){
            this.alertService.error("Un bailleur existe d??j?? avec ce nom...");
          }
          return false;
        }
      }
      if(tmpToCheck.immatriculation=='' && tmpToCheck.type == BailleurType.Morale){
        if(displayError){
          this.alertService.error("Un bailleur moral doit obligatoirement d??finir une immatriculation...");
        }
        return false;
      }
    }else{
      if(displayError){
        this.alertService.error("Impossible de cr??er ce bailleur...");
      }
      return false;
    }
    return true;
  }

  public checkBien(toCheck: any, displayError: boolean = false){
    var tmpToCheck = Bien.fromJSON(toCheck)
    if(tmpToCheck){
      for (var _i = 0; _i < this.document.biens.length; _i++) {
        if(this.document.biens[_i].nom == tmpToCheck.nom){
          if(displayError){
            this.alertService.error("Un bien existe d??j?? avec ce nom...");
          }
          return false;
        }
      }
    }else{
      if(displayError){
        this.alertService.error("Impossible de cr??er ce bien...");
      }
      return false;
    }
    return true;
  }

  public checkBail(toCheck: any, displayError: boolean = false){
    var tmpToCheck = Bail.fromJSON(toCheck, this.document.locataires, this.document.biens)
    if(tmpToCheck){
      for (var _i = 0; _i < this.document.bails.length; _i++) {
        if(this.document.bails[_i].locataire.id == tmpToCheck.locataire.id){
          if(displayError){
            this.alertService.error("Un bail existe d??j?? avec ce locataire...");
          }
          return false;
        }
      }
    }else{
      if(displayError){
        this.alertService.error("Impossible de cr??er ce bail...");
      }
      return false;
    }
    return true;
  }
  public removePieceInDocument(piece: Piece){
    //Remove in list of pieces
    const index = this.document.pieces.indexOf(piece, 0);
    if (index > -1) {
      this.document.pieces.splice(index, 1);
    }

    //Remove everywhere it is used
    for (var _i = 0; _i < this.document.bailleurs.length; _i++) {
      const indexPiece = this.document.bailleurs[_i].pieces.indexOf(piece, 0);
      if (indexPiece > -1) {
        this.document.bailleurs[_i].pieces.splice(indexPiece, 1);
      }
    }
    for (var _i = 0; _i < this.document.locataires.length; _i++) {
      const indexPiece = this.document.locataires[_i].pieces.indexOf(piece, 0);
      if (indexPiece > -1) {
        this.document.locataires[_i].pieces.splice(indexPiece, 1);
      }
    }
    for (var _i = 0; _i < this.document.biens.length; _i++) {
      const indexPiece = this.document.biens[_i].pieces.indexOf(piece, 0);
      if (indexPiece > -1) {
        this.document.biens[_i].pieces.splice(indexPiece, 1);
      }
    }
    for (var _i = 0; _i < this.document.bails.length; _i++) {
      const indexPiece = this.document.bails[_i].pieces.indexOf(piece, 0);
      if (indexPiece > -1) {
        this.document.bails[_i].pieces.splice(indexPiece, 1);
      }
    }
    for (var _i = 0; _i < this.document.mouvements.length; _i++) {
      if(this.document.mouvements[_i].quittance){
        if (this.document.mouvements[_i].quittance == piece) {
          this.document.mouvements[_i].quittance = null;
        }
      }
    }
  }

  public getPieceUsage(piece: Piece){
    let pieceUsers : any[] = [];
    for (var _i = 0; _i < this.document.bailleurs.length; _i++) {
      if(this.document.bailleurs[_i].pieces.indexOf(piece, 0) > -1){
        pieceUsers.push(this.document.bailleurs[_i]);
      }
    }
    for (var _i = 0; _i < this.document.locataires.length; _i++) {
      if(this.document.locataires[_i].pieces.indexOf(piece, 0) > -1){
        pieceUsers.push(this.document.locataires[_i]);
      }
    }
    for (var _i = 0; _i < this.document.biens.length; _i++) {
      if(this.document.biens[_i].pieces.indexOf(piece, 0) > -1){
        pieceUsers.push(this.document.biens[_i]);
      }
    }
    for (var _i = 0; _i < this.document.bails.length; _i++) {
      if(this.document.bails[_i].pieces.indexOf(piece, 0) > -1){
        pieceUsers.push(this.document.bails[_i]);
      }
    }
    return pieceUsers;
  }

  public getYearRentability(){

    var rentabilities: number[] = [];

    this.document.biens.forEach((bien:Bien) => {
      const bienRentability = bien.getYearRentability(this.document.mouvements);
      if(bienRentability != 0){
        rentabilities.push(bienRentability);
      }
    });

    //Compute sum and then average in two lines
    const sum = rentabilities.reduce((a, b) => a + b, 0);
    const avg = (sum / rentabilities.length) || 0;
    //Return the global rentability (which is the mean of all rentabilities)
    return avg;
  }

  public getBilan(){
    var gains: number = 0;
    this.document.biens.forEach((bien:Bien) => {
      gains = gains + bien.getBilan(this.document.mouvements);
    });
    //Return the global bilan
    return Math.round(gains);
  }
}