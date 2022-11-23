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
          setInterval(() => this.watchDocumentSync(), this.autoSyncDuration * 1000);
          setInterval(() => this.watchDocumentModification(), this.autoSaveDuration * 1000);
        }
      });
    }else{
      // If drive is not compliant we are not loading
      this.isLoading = false;
    }
  }

  public saveDocumentFile(){
    //First check if a more recent file existe on the server (which is not good)
    this.driveService.get(this.driveService.dataFileId).then( 
      (response: any) => {
        if(response && response.result && response.result.version && this.driveService.dataFileVersion == response.result.version){
          console.dir("File is the last version. Save can be executed");
          //Document is converted in a JSON string
          const documentJson = JSON.stringify(this.document.toJSON());
          //Save document throught the drive service
          this.driveService.upload(this.driveService.dataFileId, this.driveService.dataFileName, documentJson).subscribe(
            (response:any) => {
              console.log('Modification saved.');
              this.docIsModified = false;

              //Now that document is updated get the new version
              this.driveService.get(this.driveService.dataFileId).then( 
                (response: any) => {
                  if(response && response.result && response.result.version){
                    this.driveService.dataFileVersion = response.result.version;
                  }
                }
              );
            },
            (error:any) => {
              this.alertService.error("Impossible de sauvegarder le document. Veuillez vérifier votre connexion.",true);
              console.error('Modification not saved : ');
              console.dir(error);
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
        console.log('Modification détectée.');
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
            this.alertService.error("Un locataire existe déjà avec ce nom...");
          }
          return false;
        }
      }
    }else{
      if(displayError){
        this.alertService.error("Impossible de créer ce locataire...");
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
            this.alertService.error("Un bailleur existe déjà avec ce nom...");
          }
          return false;
        }
      }
      if(tmpToCheck.immatriculation=='' && tmpToCheck.type == BailleurType.Morale){
        if(displayError){
          this.alertService.error("Un bailleur moral doit obligatoirement définir une immatriculation...");
        }
        return false;
      }
    }else{
      if(displayError){
        this.alertService.error("Impossible de créer ce bailleur...");
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
            this.alertService.error("Un bien existe déjà avec ce nom...");
          }
          return false;
        }
      }
    }else{
      if(displayError){
        this.alertService.error("Impossible de créer ce bien...");
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
            this.alertService.error("Un bail existe déjà avec ce locataire...");
          }
          return false;
        }
      }
    }else{
      if(displayError){
        this.alertService.error("Impossible de créer ce bail...");
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

  //Function to check all mandatory pieces for a piece container (bien, locataire, ...)
  public checkPiecesObligatoires(piecesContainer: any): string[]{
    //The array with all missing pieces
    var piecesManquantes: string[] = [];
    //First get in configuration the mandatary pieces for the piece container provided
    var piecesObligatoires = this.configurationService.getValue("piecesObligatoires"+piecesContainer.className);
    //Split it into an array
    piecesObligatoires = piecesObligatoires.split(",");
    //By default the piece container is compliant
    var isCompliant = true;

    //Browse all mandatary pieces one by one
    piecesObligatoires.forEach((pieceObligatoire: string) => {
      //If the mandatary piece is an alternative possibility
      var piecesObligatoiresAlt = pieceObligatoire.split("|");
      //By default the piece is not found
      var pieceFound = false;
      //Browse all mandatary pieces alternatives one by one
      piecesObligatoiresAlt.forEach((pieceObligatoireAlt: string) => {
        //By default the alternative piece is not found
        var pieceAltFound = false;
        //Now look in all pieces linked with the piece to find the alternative piece
        piecesContainer.pieces.forEach((piece: Piece) => {
          // Found an alternative piece
          if(piece.code == pieceObligatoireAlt){
            pieceAltFound = true;
          }
        });
        // The result is an 'OR' as this is an alternative
        pieceFound =  pieceFound || pieceAltFound;
      });
      // The result is an 'AND' as this is no more an alternative but a mandatary one
      isCompliant = isCompliant && pieceFound;
      // If the piece is not found while it should be then add it in the list 
      // If all the alternatives are not found => add the complete list of alterntives not one by one
      if(!pieceFound)piecesManquantes.push(pieceObligatoire);
    });
    return piecesManquantes;
  }

  //Function to check all mandatory pieces for all piece containers of the document (bien, locataire, ...)
  public checkAllPiecesObligatoires(): any[]{
    
    //Object return with all missing pieces 
    var uncompliantList : any[] = [];

    //Lpop through all locataires
    for (var _i = 0; _i < this.document.locataires.length; _i++) {
      //Get the missing pieces
      const piecesManquantes = this.checkPiecesObligatoires(this.document.locataires[_i]);
      //If at least one piece is missing
      if(piecesManquantes.length>0){
        //Then add the locataire and all missing pieces in the list that will be returned
        uncompliantList.push({'piecesContainer':this.document.locataires[_i], 'piecesManquantes': piecesManquantes});
      }
    }
    //Same for the bailleurs
    for (var _i = 0; _i < this.document.bailleurs.length; _i++) {
      const piecesManquantes = this.checkPiecesObligatoires(this.document.bailleurs[_i]);
      if(piecesManquantes.length>0){
        uncompliantList.push({'piecesContainer':this.document.bailleurs[_i], 'piecesManquantes': piecesManquantes});
      }
    }
    //Same for the biens
    for (var _i = 0; _i < this.document.biens.length; _i++) {
      const piecesManquantes = this.checkPiecesObligatoires(this.document.biens[_i]);
      if(piecesManquantes.length>0){
        uncompliantList.push({'piecesContainer':this.document.biens[_i], 'piecesManquantes': piecesManquantes});
      }
    }
    //Same for the bails
    for (var _i = 0; _i < this.document.bails.length; _i++) {
      if(!this.document.bails[_i].dateFin){
        const piecesManquantes = this.checkPiecesObligatoires(this.document.bails[_i]);
        if(piecesManquantes.length>0){
          uncompliantList.push({'piecesContainer':this.document.bails[_i], 'piecesManquantes': piecesManquantes});
        }
      }
    }
    //Return full results
    return uncompliantList;
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

  public getUnpaiedLoyer(bail: Bail):{ bail: Bail; date: Date }[] {
    //Get current date
    const currentDate = new Date();
    //Get number month to analyse in configuration
    const nbUnpaiedLoyerMonth = parseInt(this.configurationService.getValue("bailUnpaiedLoyerNb"));
    //Variable that will store all bails with month unpaied
    var unpaiedLoyers: { bail: Bail; date: Date }[] = [];
    //We just consider active bail (bail not closed)
    if(!bail.dateFin){
      //We control if there is paiement date otherwise can not compute
      if(bail.paiementDate){
        //We will check as many months as configured
        var offsetMonth = 0;
        for(let i = 0; i < nbUnpaiedLoyerMonth; i++){

          //We start by the current month (that is until today)
          var comparePeriod = new Date(currentDate.getFullYear(), currentDate.getMonth() - (offsetMonth+i), bail.paiementDate.getDate());
          if(comparePeriod > currentDate){
            offsetMonth = 1;
            comparePeriod = new Date(currentDate.getFullYear(), currentDate.getMonth() - (offsetMonth+i), bail.paiementDate.getDate());
          }
          //By default nothing is found
          var monthFound = false;

          //Look in all pieces to look for the quittance of the compare period
          bail.pieces.forEach((piece:Piece) => {
            //JUst consider pieces that are bail
            if(piece.code == 'BAIL_QUIT'){
              const quittanceDate = piece.description.substr(-7,7);
              const compareDate = comparePeriod.getFullYear()+"-"+(comparePeriod.getMonth()+1<10?'0':'') + (comparePeriod.getMonth()+1);
              // If the quittance date match the looking date then it is paied !
              if(quittanceDate == compareDate){
                monthFound = true;
              }
            }
          });
          //If no quittance founad thus this is not paied
          if(!monthFound){
            unpaiedLoyers.push({bail:bail, date: comparePeriod});
          }
        }
      }
    }
    return unpaiedLoyers;
  }

  public getUnpaiedLoyerForAll():{ bail: Bail; date: Date }[] {
    //Variable that will store all bails with month unpaied
    var unpaiedLoyers: { bail: Bail; date: Date }[] = [];
    //We take each bail one by one to look for problems
    this.document.bails.forEach((bail:Bail) => {
      //Get unpaied loyers for this bail
      var unpaiedLoyer = this.getUnpaiedLoyer(bail);
      //Add this to the full list
      unpaiedLoyers = unpaiedLoyers.concat(unpaiedLoyer); 
    });
    return unpaiedLoyers;
  }


  public getUnrentBien(bien:Bien):{ bien: Bien; nbJours: number } | undefined {
    //Get current date
    const currentDate = new Date();
    //By default nothing is found
    var bailFound = false;
    //Number fo days since end date of bail
    var bailDeltaNbJour = 10000;

    //Look in all bails to look for the bien
    this.document.bails.forEach((bail:Bail) => {
      //Get the bail for the current bien
      if(bail.bien == bien){
        //There is no end date thus the bien is rent
        if(!bail.dateFin){
          bailFound = true;
        }else{
          //Get time difference to know since how long the bien is not rent
          const diffTime = Math.abs(currentDate.valueOf() - bail.dateFin.valueOf());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          //If this is a shortest time than keep that time 
          if(diffDays < bailDeltaNbJour){
            bailDeltaNbJour = diffDays;
          }
        }
      }
    });
    //If no bail found thus this is not rent
    //If never rent then it returns 10000 days
    if(!bailFound){
      return {bien:bien, nbJours: bailDeltaNbJour};
    }
    return undefined;
  }

  public getUnrentBienForAll():{ bien: Bien; nbJours: number }[] {

    //Variable that will store all bails with month unpaied
    var unrentBiens: { bien: Bien; nbJours: number }[] = [];
    //We take each bail one by one to look for problems
    this.document.biens.forEach((bien:Bien) => {
      //Get info if this bien is not rent
      var unrentBien = this.getUnrentBien(bien);
      //Add this to the full list
      if(unrentBien){
        unrentBiens.push(unrentBien);
      }

    });
    return unrentBiens;
  }

  public getLoyerToUpdate(bail:Bail):{ bail: Bail; nbJours: number; toUpdate: boolean } | undefined {
    //Get configuration for warning
    const dureeRevisionLoyer = parseInt(this.configurationService.getValue('dureeRevisionLoyer'));
    //Get current date
    const currentDate = new Date();
    //By default nothing is found
    var bailFound = false;
    //Number of days since revision of loyer date
    var bailDeltaNbJour = 0;
    //We just get bail that are not ended
    if(!bail.dateFin){
      //If we have depassed the date de revision of the loyer
      if (bail.dateRevisionLoyer < currentDate){
        bailFound = true;
        //COmpute difference of time
        const diffTime = Math.abs(currentDate.valueOf() - bail.dateRevisionLoyer.valueOf());
        bailDeltaNbJour = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }
    }

    //If the date has been depassed
    if(bailFound){
      return {bail: bail, nbJours: bailDeltaNbJour, toUpdate: bailDeltaNbJour>dureeRevisionLoyer};
    }
    return undefined;
  }

  public getLoyerToUpdateForAll():{ bail: Bail; nbJours: number; toUpdate: boolean }[] {

    //Variable that will store all bails with month unpaied
    var updateLoyerBails: { bail: Bail; nbJours: number; toUpdate: boolean }[] = [];
    //We take each bail one by one to look for problems
    this.document.bails.forEach((bail: Bail) => {
      //Get info if this bien is not rent
      var updateLoyerBail = this.getLoyerToUpdate(bail);
      //Add this to the full list
      if(updateLoyerBail){
        updateLoyerBails.push(updateLoyerBail);
      }
    });
    return updateLoyerBails;
  }

  public getMouvementsWithoutQuittance(): Mouvement[]{

    //Get number month to analyse in configuration
    const nbCheckQuittance = parseInt(this.configurationService.getValue("nbCheckQuittance"));
    const currentDate = new Date();
    const comparePeriod = new Date(currentDate.getFullYear(), currentDate.getMonth() - nbCheckQuittance, 1);

    var mouvWithoutQuittance: Mouvement[] = [];
    //We take each mouvement one by one to look for problems
    this.document.mouvements.forEach((mouvement: Mouvement) => {
      //Add this to the full list if there is a problem
      if(mouvement.montant>0 && !mouvement.quittance && mouvement.date>comparePeriod){
        mouvWithoutQuittance.push(mouvement);
      }
    });
    return mouvWithoutQuittance;
  }


}
