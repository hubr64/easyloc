import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

import { ConfigurationService } from './configuration.service';
import { DocumentService } from './document.service';

import { Event, EventAction } from '../_modeles/event';
import { Bail } from '../_modeles/bail';
import { Bailleur } from '../_modeles/bailleur';
import { Locataire } from '../_modeles/locataire';
import { Bien } from '../_modeles/bien';
import { Piece } from '../_modeles/piece';
import { Mouvement } from '../_modeles/mouvement';

@Injectable()
export class EventService {

    //List of all events
    private bailEvents: Event[] = [];
    private bienEvents: Event[] = [];
    private locataireEvents: Event[] = [];
    private bailleurEvents: Event[] = [];
    private mouvementEvents: Event[] = [];
    // Variables used to know if the events are loaded
    public eventsAreLoaded: boolean;
    public eventsAreLoadedChange: Subject<boolean> = new Subject<boolean>();

    constructor(
        private documentService: DocumentService,
        private configurationService: ConfigurationService) {

        console.log("EventService:constructor");

        //By default the events are necessarly not loaded
        this.eventsAreLoaded = false;
        this.eventsAreLoadedChange.subscribe((value: boolean) => {
            this.eventsAreLoaded = value
        });
        this.eventsAreLoadedChange.next(false);

        // Subscribe in case the document was reloaded
        this.documentService.docIsLoadedChange.subscribe((isLoaded: boolean) => {
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
        console.log("EventService:Compute events from loaded document")
        //First reinit the arrays
        this.initEvents();
        //Then load all events
        this.loadEvents();
        //Alert every user of events that loading is ended
        this.eventsAreLoadedChange.next(true);
    }

    private initEvents(){
        this.bailEvents = [];
        this.bienEvents = [];
        this.locataireEvents = [];
        this.bailleurEvents = [];
        this.mouvementEvents = [];
    }

    private loadEvents(){
        //Load all events related to bails
        this.loadBailEvent();
        //Load all events related to biens
        this.loadBienEvent();
        //Load all events related to mouvements
        this.loadMouvementEvent();
        //Load all events related to bailleurs
        this.loadBailleurEvent();
        //Load all events related to locataires
        this.loadLocataireEvent();
    }

    private loadBailEvent() {
        //We take each bail one by one to look for events
        this.documentService.document.bails.forEach((bail:Bail) => {
            //Get unpaied loyers for this bail
            var unpaiedLoyerEvent = this.getUnpaiedLoyer(bail);
            this.bailEvents = this.bailEvents.concat(unpaiedLoyerEvent);
            //Get loyer to update
            var updateLoyer = this.getLoyerToUpdate(bail);
            if(updateLoyer){
                this.bailEvents.push(updateLoyer);
            }
        });
    }

    private loadBienEvent() {
        //We take each bail one by one to look for events
        this.documentService.document.biens.forEach((bien:Bien) => {
            //Get info if this bien is not rent
            var unrentBien = this.getUnrentBien(bien);
            if(unrentBien){
                this.bienEvents.push(unrentBien);
            }
            var nonAssureBien = this.getBienNonAssure(bien);
            if(nonAssureBien){
                this.bienEvents.push(nonAssureBien);
            }
            var nonTaxBien = this.getBienTaxeNonpaye(bien);
            if(nonTaxBien){
                this.bienEvents.push(nonTaxBien);
            }
        });
    }

    private loadBailleurEvent() {
        //We take each bail one by one to look for events
        this.documentService.document.bailleurs.forEach((bailleur:Bailleur) => {
        });
    }

    private loadLocataireEvent() {
        //We take each bail one by one to look for events
        this.documentService.document.locataires.forEach((locataire:Locataire) => {
        });
    }

    private loadMouvementEvent() {
        //Get all mouvements without quittance while it should have
        var mouvementSansQuittance = this.getMouvementsWithoutQuittance();
        this.mouvementEvents = this.mouvementEvents.concat(mouvementSansQuittance);
    }

    public getEvents(object: any, gravite?: number): Event[] {
        //Return the list of events according to object type passed in parameter and gravity required
        if(object.className=='Bien') return this.getBienEvents(object, gravite);
        if(object.className=='Bail') return this.getBailEvents(object, gravite);
        if(object.className=='Bailleur') return this.getBailleurEvents(object, gravite);
        if(object.className=='Locataire') return this.getLocataireEvents(object, gravite);
        if(object.className=='Mouvement') return this.getMouvementEvents(object, gravite);
        //If not acceptable object type return no event
        return [];
    }


    public getBienEvents(bien?: Bien, gravite?: number): Event[]{
        //Return variable declaration
        var returnEvent: Event[] = [];
        //Browse alle events for biens
        this.bienEvents.forEach((event:Event) => {
            //If a specific bien is provided and is matched or if no bien provided
            if ((bien && event.object && bien.id == event.object.id) || !bien){
                //If a specific gravity is provided and is greater then or equal or if no gravity provided
                if((gravite && event.gravite && event.gravite>= gravite) || !gravite){
                    returnEvent.push(event);
                }
            }
        });
        return returnEvent;
    }

    public getLocataireEvents(locataire?: Locataire, gravite?: number): Event[]{
        //Return variable declaration
        var returnEvent: Event[] = [];
        //Browse alle events for locataires
        this.locataireEvents.forEach((event:Event) => {
            //If a specific locataire is provided and is matched or if no locataire provided
            if ((locataire && event.object && locataire.id == event.object.id) || !locataire){
                //If a specific gravity is provided and is greater then or equal or if no gravity provided
                if((gravite && event.gravite && event.gravite>= gravite) || !gravite){
                    returnEvent.push(event);
                }
            }
        });
        return returnEvent;
    }

    public getBailEvents(bail?: Bail, gravite?: number): Event[] {
        //Return variable declaration
        var returnEvent: Event[] = [];
        //Browse alle events for bails
        this.bailEvents.forEach((event:Event) => {
            //If a specific bail is provided and is matched or if no bail provided
            if ((bail && event.object && bail.id == event.object.id) || !bail){
                //If a specific gravity is provided and is greater then or equal or if no gravity provided
                if((gravite && event.gravite && event.gravite>= gravite) || !gravite){
                    returnEvent.push(event);
                }
            }
        });
        return returnEvent;
    }

    public getBailleurEvents(bailleur?: Bailleur, gravite?: number): Event[] {
        //Return variable declaration
        var returnEvent: Event[] = [];
        //Browse alle events for bailleurs
        this.bailleurEvents.forEach((event:Event) => {
            //If a specific bailleur is provided and is matched or if no bailleur provided
            if ((bailleur && event.object && bailleur.id == event.object.id) || !bailleur){
                //If a specific gravity is provided and is greater then or equal or if no gravity provided
                if((gravite && event.gravite && event.gravite>= gravite) || !gravite){
                    returnEvent.push(event);
                }
            }
        });
        return returnEvent;
    }

    public getMouvementEvents(mouvement?: Mouvement, gravite?: number): Event[] {
        //Return variable declaration
        var returnEvent: Event[] = [];
        //Browse all events for mouvements
        this.mouvementEvents.forEach((event:Event) => {
            //If a specific mouvement is provided and is matched or if no mouvement provided
            if ((mouvement && event.object && mouvement.id == event.object.id) || !mouvement){
                //If a specific gravity is provided and is greater then or equal or if no gravity provided
                if((gravite && event.gravite && event.gravite>= gravite) || !gravite){
                    returnEvent.push(event);
                }
            }
        });
        return returnEvent;
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

    /********************* BIENS ***********************/

    public getUnrentBien(bien:Bien): Event|undefined {
        //Get current date
        const currentDate = new Date();
        //By default nothing is found
        var bailFound = false;
        //Number of days since end date of bail
        var bailDeltaNbJour = 10000;
        //Look in all bails to look for the bien
        this.documentService.document.bails.forEach((bail:Bail) => {
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
        //If 10000 days then never rent as it remains the max possible value 
        if(!bailFound){
            var unrentEvent: Event = new Event();
            if(bailDeltaNbJour == 10000){
                unrentEvent.designation = "Le bien n'a jamais été loué";
                unrentEvent.gravite = 2;
                unrentEvent.icone = "apartment";
            }else{
                unrentEvent.designation = "Le bien n'est pas loué depuis "+bailDeltaNbJour+" jours";
                unrentEvent.gravite = 2;
                unrentEvent.icone = "person";
            }
            unrentEvent.object = bien;

            //Add the actions possible for this event
            var unrentEventAction1: EventAction = new EventAction();
            unrentEventAction1.icone = "visibility";
            unrentEventAction1.title = "Voir le bien";
            unrentEventAction1.routerLink = '/fiche/bien/'+bien.id;
            unrentEvent.actions.push(unrentEventAction1);
            var unrentEventAction2: EventAction = new EventAction();
            unrentEventAction2.icone = "support";
            unrentEventAction2.title = "Créer un bail";
            unrentEventAction2.routerLink = '/new/bail/';
            unrentEvent.actions.push(unrentEventAction2);

          return unrentEvent;
        }
        //If the bail is found it means that the bien is rent
        //We do not create an info event has it is obvious in the MMI
        return undefined;
    }

    private getBienNonAssure(bien:Bien): Event|undefined {
        
        //Get current date
        const currentDate = new Date();
        //Text to look for in mouvement
        const assuranceText: string = "assurance pno";
        //Result of the analysis
        var isNotAssure: boolean = true;
        var mouvementAssure: Mouvement|undefined = undefined;
        //First get in configuration the marge to pay assurance
        var margePaiementAssurance = parseInt(this.configurationService.getValue("margePaiementAssurance"));

        //We can only check bien with an assurance date defined
        if(bien.dateAssurance){

            //First align assurance date to current year
            var assuranceDateOfYear = new Date(bien.dateAssurance.getTime());
            assuranceDateOfYear.setFullYear(currentDate.getFullYear());
            // If aligned date is after now then we need to remove one more year
            if(assuranceDateOfYear > currentDate){
                assuranceDateOfYear.setFullYear(assuranceDateOfYear.getFullYear() - 1);
            }
            //Compute start of the analysis (at least one year before the due date)
            var startAnalysisAssuranceDate = new Date(assuranceDateOfYear.getTime());
            startAnalysisAssuranceDate.setFullYear(startAnalysisAssuranceDate.getFullYear() - 1);
            //Compute end date of the analysis (at least one month after the due date)
            var endAnalysisAssuranceDate = assuranceDateOfYear;
            endAnalysisAssuranceDate.setMonth(endAnalysisAssuranceDate.getMonth() + margePaiementAssurance);

            //Browse all mouvements to look for assurance
            this.documentService.document.mouvements.forEach((mouvement:Mouvement) => {
                //We look only if we still didn't find the assurance
                if(isNotAssure){
                    //We are lokking for mouvement of the current bien only
                    if(mouvement.bien == bien){
                        //We look for mouvement with specific text and an out mouvement
                        if(mouvement.libelle.toLowerCase().indexOf(assuranceText)!=-1 && mouvement.montant<0){
                            //If the mouvement is a paiement between the computed date then it is the correct paiement
                            if(mouvement.date > startAnalysisAssuranceDate && mouvement.date < endAnalysisAssuranceDate){
                                isNotAssure = false;
                                mouvementAssure = mouvement;
                            }
                        }
                    }
                }
            });
        }else{
            //No assurance date defined : no possibility to look for assurance state
            isNotAssure = false;
        }

        //The bien is not assured then add an event to alert
        if(isNotAssure){
            var nonAssureEvent: Event = new Event();
            nonAssureEvent.designation = "L'assurance du bien n'est pas payée";
            nonAssureEvent.gravite = 2;
            nonAssureEvent.icone = "shield";
            nonAssureEvent.object = bien;

            //Add possible actions
            var nonAssureEventAction1: EventAction = new EventAction();
            nonAssureEventAction1.icone = "visibility";
            nonAssureEventAction1.title = "Voir le bien";
            nonAssureEventAction1.routerLink = '/fiche/bien/'+bien.id;
            nonAssureEvent.actions.push(nonAssureEventAction1);
            var nonAssureEventAction2: EventAction = new EventAction();
            nonAssureEventAction2.icone = "euro_symbol";
            nonAssureEventAction2.title = "Ajouter le paiement";
            nonAssureEventAction2.routerLink = '/mouvements';
            nonAssureEvent.actions.push(nonAssureEventAction2);

            return nonAssureEvent;
        }else{
            // If the bien is assured and the mouvement is found then just inform
            if(mouvementAssure != undefined){
                var assureEvent: Event = new Event();
                assureEvent.designation = "Le bien est assuré via "+ mouvementAssure;
                assureEvent.gravite = 0;
                assureEvent.icone = "shield";
                assureEvent.object = bien;
                return assureEvent;
            }
        }

        //Impossible to define whether the bien is assured or not
        return undefined;
    }

    private getBienTaxeNonpaye(bien:Bien): Event|undefined {
        //Get current date
        const currentDate = new Date();
        //Text to look for in mouvement
        const taxeText: string = "taxe";
        //Get in configuration the last possible paiement date for tax
        var datePaiementTaxe = new Date(this.configurationService.getValue("datePaiementTaxe"));
        //Result of the analysis
        var isNotTaxed: number = 0; // 0 => non payé, 1 => payé, 2 => payé en retard
        var mouvementTaxe: Mouvement|undefined = undefined;

        //If a date is correctly configured
        if(datePaiementTaxe){

            //First align taxe date to current year
            datePaiementTaxe.setFullYear(currentDate.getFullYear());

            // If aligned date is after now then we need to remove one more year
            if(datePaiementTaxe > currentDate){
                datePaiementTaxe.setFullYear(datePaiementTaxe.getFullYear() - 1);
            }
            
            //Compute start and end date of the analysis
            var startAnalysisTaxDate = new Date(datePaiementTaxe.getTime());
            startAnalysisTaxDate.setFullYear(startAnalysisTaxDate.getFullYear() - 1);
            var endAnalysisTaxDate = datePaiementTaxe;
            var endOfYear = new Date(currentDate.getFullYear(),11,31);

            //Browse all mouvements to look for tax
            this.documentService.document.mouvements.forEach((mouvement:Mouvement) => {
                //We look only if we still didn't find the tax
                if(isNotTaxed == 0){
                    //We are looking for mouvement of the current bien only
                    if(mouvement.bien == bien){
                        //We look for mouvement with specific text and an out mouvement
                        if(mouvement.libelle.toLowerCase().indexOf(taxeText)!=-1 && mouvement.montant<0){
                            //If the mouvement is a paiement between the computed date then it is the correct paiement
                            if(mouvement.date > startAnalysisTaxDate && mouvement.date < endAnalysisTaxDate){
                                isNotTaxed = 1;
                                mouvementTaxe = mouvement;
                            }
                        }
                    }
                }
            });
            //Can not find the mouvement inside the date, try to find after the end but still this year to find a late paiement
            if(isNotTaxed == 0){
                //Browse all mouvements to look for tax
                this.documentService.document.mouvements.forEach((mouvement:Mouvement) => {
                    //We look only if we still didn't find the tax
                    if(isNotTaxed == 0){
                        //We are looking for mouvement of the current bien only
                        if(mouvement.bien == bien){
                            //We look for mouvement with specific text and an out mouvement
                            if(mouvement.libelle.toLowerCase().indexOf(taxeText)!=-1 && mouvement.montant<0){
                                //If the mouvement is a paiement between the end date and now then it is the late paiement
                                if(mouvement.date > endAnalysisTaxDate && currentDate < endOfYear){
                                    isNotTaxed = 2;
                                    mouvementTaxe = mouvement;
                                }
                            }
                        }
                    }
                });
            }

            //The tax paiement is late or not realised then add an event to alert
            if(isNotTaxed==0 || isNotTaxed==2){
    
                //Global event definition
                var nonTaxEvent: Event = new Event();
                nonTaxEvent.icone = "account_balance";
                nonTaxEvent.object = bien;
                //Message is different according it is not paied or paied late
                if(isNotTaxed==0){
                    nonTaxEvent.designation = "La taxe foncière n'est pas payée";
                    nonTaxEvent.gravite = 2;
                }else{
                    if(mouvementTaxe){
                        nonTaxEvent.designation = "La taxe foncière a été payée en retard via "+ mouvementTaxe;
                    }else{
                        nonTaxEvent.designation = "La taxe foncière a été payée en retard";
                    }
                    nonTaxEvent.gravite = 1;
                }
                //Add possible actions
                var nonTaxEventAction1: EventAction = new EventAction();
                nonTaxEventAction1.icone = "visibility";
                nonTaxEventAction1.title = "Voir le bien";
                nonTaxEventAction1.routerLink = '/fiche/bien/'+bien.id;
                nonTaxEvent.actions.push(nonTaxEventAction1);
                var nonTaxEventAction2: EventAction = new EventAction();
                nonTaxEventAction2.icone = "euro_symbol";
                nonTaxEventAction2.title = "Ajouter le paiement";
                nonTaxEventAction2.routerLink = '/mouvements';
                nonTaxEvent.actions.push(nonTaxEventAction2);
                return nonTaxEvent;
            }else{
                // If the tax has been paied for the bien and the mouvement is found then just inform
                if(mouvementTaxe != undefined){
                    var taxEvent: Event = new Event();
                    taxEvent.designation = "La taxe foncière a été payée via "+ mouvementTaxe;
                    taxEvent.gravite = 0;
                    taxEvent.icone = "account_balance";
                    taxEvent.object = bien;
                    return taxEvent;
                }
            }
        }
        //Impossible to define whether the bien is assured or not
        return undefined;
    }

    /********************* BAILS ***********************/

    private getUnpaiedLoyer(bail: Bail):Event[] {
        //Get current date
        const currentDate = new Date();
        //Get number month to analyse in configuration
        const nbUnpaiedLoyerMonth = parseInt(this.configurationService.getValue("bailUnpaiedLoyerNb"));
        //Date output configuration
        const dateOptions: Intl.DateTimeFormatOptions  = { year: 'numeric', month: 'long' };

        //Variable that will store all bails with month unpaied
        var unpaiedLoyers: Event[] = [];

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

              //If the compare period is before the begining of the bail then it is considered as paid
              if(comparePeriod.setHours(0, 0, 0, 0) < bail.dateDebut.setHours(0, 0, 0, 0)){
                monthFound = true;
              }
    
              //Look in all pieces to look for the quittance of the compare period
              bail.pieces.forEach((piece:Piece) => {
                //Just consider pieces that are quittances
                if(piece.code == 'BAIL_QUIT'){
                  const quittanceDate = piece.description.substr(-7,7);
                  const compareDate = comparePeriod.getFullYear()+"-"+(comparePeriod.getMonth()+1<10?'0':'') + (comparePeriod.getMonth()+1);
                  // If the quittance date match the looking date then it is paied !
                  if(quittanceDate == compareDate){
                    monthFound = true;
                  }
                }
              });
              //If no quittance found thus this is not paied
              if(!monthFound){
                var unpaidEvent: Event = new Event();
                unpaidEvent.designation = "Loyer impayé (" + comparePeriod.toLocaleDateString("fr-FR", dateOptions)+")";
                unpaidEvent.gravite = 2;
                unpaidEvent.icone = "receipt_long";
                unpaidEvent.object = bail;

                //Add the actions possible for this event
                var action1: EventAction = new EventAction();
                action1.icone = "receipt_long";
                action1.title = "Ajouter le paiement et acquitter";
                action1.action = 'acquitter';
                unpaidEvent.actions.push(action1);
                var action2: EventAction = new EventAction();
                action2.icone = "mail";
                action2.title = "Relancer le locataire";
                action2.action = 'relancer';
                unpaidEvent.actions.push(action2);

                //Add the event to the list of all unpaid event for this bail
                unpaiedLoyers.push(unpaidEvent);
              }
            }
          }
        }

        //If there is no event of unpaied loyer then add a zero gravity event to inform that everyhing is OK
        if(unpaiedLoyers.length==0){
            var paidEvent: Event = new Event();
            paidEvent.designation = "Paiement des loyers à jour";
            paidEvent.gravite = 0;
            paidEvent.icone = "receipt_long";
            paidEvent.object = bail;
            unpaiedLoyers.push(paidEvent);
        }
        
        return unpaiedLoyers;
    }

    public getLoyerToUpdate(bail:Bail):Event|undefined {
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
            //Compute difference of time
            const diffTime = Math.abs(currentDate.valueOf() - bail.dateRevisionLoyer.valueOf());
            bailDeltaNbJour = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          }
        }
    
        //If a bail has been found then can add an event
        if(bailFound){
            var updateEvent: Event = new Event();
            //If the bail revision is outdated then add an 2-gravity event
            if(bailDeltaNbJour>dureeRevisionLoyer){
                updateEvent.designation = "Montant du loyer à modifier depuis " + bailDeltaNbJour + " jours";
                updateEvent.gravite = 2;
                //Add the actions possible
                var action1: EventAction = new EventAction();
                action1.icone = "edit";
                action1.title = "Modifier le bail";
                action1.routerLink = '/bail/'+bail.id;
                updateEvent.actions.push(action1);
            // The bail revision is compliant then inform that everything is OK
            }else{
                updateEvent.designation = "Montant du loyer récemment mis à jour";
                updateEvent.gravite = 0;
            }
            updateEvent.icone = "currency_exchange";
            updateEvent.object = bail;

            return updateEvent;
        }
        return undefined;
    }

    /********************* MOUVEMENTS ***********************/

    public getMouvementsWithoutQuittance(): Event[]{

        //Get number month to analyse in configuration
        const nbCheckQuittance = parseInt(this.configurationService.getValue("nbCheckQuittance"));
        const currentDate = new Date();
        const comparePeriod = new Date(currentDate.getFullYear(), currentDate.getMonth() - nbCheckQuittance, 1);
    
        var mouvWithoutQuittance: Event[] = [];
        //We take each mouvement one by one to look for problems
        this.documentService.document.mouvements.forEach((mouvement: Mouvement) => {
          //Add this to the full list if there is a problem
          if(mouvement.montant>0 && mouvement.libelle.toLocaleLowerCase().indexOf("loyer")!=-1 && !mouvement.quittance && mouvement.date>comparePeriod){
            var quittanceEvent: Event = new Event();
            quittanceEvent.designation = mouvement.libelle + "(" + mouvement.montant +"€) non acquité";
            quittanceEvent.gravite = 1;
            quittanceEvent.icone = "euro_symbol";
            quittanceEvent.object = mouvement;
            //Add the actions possible for this event
            var action1: EventAction = new EventAction();
            action1.icone = "receipt_long";
            action1.title = "Acquitter";
            action1.routerLink = '/quittance/'+mouvement.id;
            quittanceEvent.actions.push(action1);
            //Add the no quittance event with the list of all mouvements without quittance
            mouvWithoutQuittance.push(quittanceEvent);
          }
        });
        return mouvWithoutQuittance;
    }

}