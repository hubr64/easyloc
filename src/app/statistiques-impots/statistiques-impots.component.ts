import { Component, OnInit, Input, ViewChild, ElementRef } from '@angular/core';
import { Location } from '@angular/common';

import { MAT_RADIO_DEFAULT_OPTIONS} from '@angular/material/radio';

import { Bien } from '../_modeles/bien';
import { Mouvement } from '../_modeles/mouvement';
import { Bail } from '../_modeles/bail';
import { DocumentService } from '../_services/document.service';
import { ConfigurationService } from '../_services/configuration.service';

type MouvementClassified = {
  [key: string]: {
    [key: number]: {
      mouvements: {
        [key: string] : {
          liste: any[],
          total: number
        }
      }
      total: number,
      charges: number
    }
  }
};
type BienTotal = {
  [key: string]: {
    [key: number]: {
      totalIn: number,
      totalOut: number,
      bestForfait: boolean
    }
  }
};
type RegularisationCharges = {
  [key: string]: {
    chargeNonRecuperees: number,
    chargeNonDeductible: number,
    chargeTropPercu: number
  }
};

@Component({
  selector: 'app-statistiques-impots',
  templateUrl: './statistiques-impots.component.html',
  styleUrls: ['./statistiques-impots.component.scss'],
  providers: [
    {
      provide: MAT_RADIO_DEFAULT_OPTIONS,
      useValue: { color: 'warn' },
    },

  ],
})
export class StatistiquesImpotsComponent implements OnInit {

  //Input and output of the components
  @Input() defaultBien: Bien;

  //Variable to store all years to ask to user
  public annees = Array(10).fill(0).map((x,i)=>new Date().getFullYear() - i);

  //Name of the selected bien and selected year
  public selectedBien: string;
  public selectedAnnee: number;
  //Selected regime to compute the final value to declare
  public selectedRegime: number;
  // An object use to temporarily store the input value of the user
  public regulCharges: RegularisationCharges;

  //Lists of standard texts to look for specific mouvements
  public txtIn : string[];
  public txtOut : string[];
  //Boolean to state if the computation of all valus has ended or not
  public computeEnded: boolean = false;
  //Bolean used to choose if user wants to display or not mouvements details
  public hideMouvements: boolean = false;

  //Taux used for the micro-foncier regime (modified after by configuration)
  public tauxMicroFoncier: number = 0.3;
  //The name of the category to group all uncategorized mouvements
  public categorieAutre = "Autre";
  //Forfait used for to manage each bien
  public forfaitGestion: number = 20;
  //Mean taux that is normally  
  public tauxPartLocataire: number = 0.7;

  // All in mouvements classified for each bien by each year
  public mouvementClassifiedIn: MouvementClassified;
  public mouvementClassifiedOut: MouvementClassified;
  // An object to get sum up total for each bien and the total sumup of all biens (column total)
  public bienTotal: BienTotal;

  constructor(
    public documentService: DocumentService,
    public configurationService: ConfigurationService,
    private location: Location
  ) {
    //Get all possibles text for input
    this.txtIn = this.configurationService.getValue('mouvementAutoCompleteIn').split(";");
    //Get all possibles text for output
    this.txtOut = this.configurationService.getValue('mouvementAutoCompleteOut').split(";");
    //Add a category for all other mouvements
    this.txtIn.push(this.categorieAutre);
    this.txtOut.push(this.categorieAutre);
    //Add a specific category for the "Forfait de gestion" authorised by impots 
    this.txtOut.push("Autres frais de gestion");
    //Get forfait of micro-foncier from configuration
    this.tauxMicroFoncier = parseFloat(this.configurationService.getValue('impotDeductionForfaitaire'));
    //Get forfait of micro-foncier from configuration
    this.forfaitGestion = -parseFloat(this.configurationService.getValue('impotForfaitGestion'));
    //Get forfait of micro-foncier from configuration
    this.tauxPartLocataire = parseFloat(this.configurationService.getValue('impotChargesPartLocataire'));
  }

  ngOnInit(): void {
    //Initialise the default selected values in the form which is previous year by default
    this.selectedAnnee = new Date().getFullYear();
    if(this.defaultBien){
      this.selectedBien = this.defaultBien.nom;
    }else{
      this.selectedBien = "total";
    }

    //If document is reloaded then reset back to be sure that everything will be recompute
    this.documentService.docIsLoadedChange.subscribe((isLoaded: boolean) => {
      if(isLoaded){
        this.reset();
      }
    });
  }

  //Fonction to come back to global configuration generation
  reset(){
    this.computeEnded = false;
  }

  //Fonction to get the loyer without charges of a mouvement corresponding to a loyer paiement (as for taxes both values need to be separated)
  private getBailForMouvement(mouvement: Mouvement): Bail|undefined{
    var searchedBail:Bail|undefined;
    //Look into all bails to find the bien of the mouvement
    this.documentService.document.bails.forEach( (bail:Bail) => {
      //If the bail correspond to the mouvement (good bien and good dates) then we have found good bail
      if(bail.bien == mouvement.bien && bail.dateDebut.setHours(0, 0, 0, 0) <= mouvement.date.setHours(0, 0, 0, 0) && (!bail.dateFin || bail.dateFin.setHours(0, 0, 0, 0) >= mouvement.date.setHours(0, 0, 0, 0) )){
        //Get the loyer of the found bail
        searchedBail = bail;
      }
    });
    return searchedBail;
  }

  //Function in charge of filtering categories that may not enter in the impot computation (undeductible charge for example)
  public isUndesiredCategory(category:string): boolean {

    let isUndesiredCategory: boolean = false;

    if(category.indexOf("Travaux de construction")!=-1){
      isUndesiredCategory = true;
    }
    if(category.indexOf("Frais non déductibles")!=-1){
      isUndesiredCategory = true;
    }
    return isUndesiredCategory;
  }

  //Global function to compute everything
  computeImpots(){

    //Computation begin
    this.computeEnded = false;

    //Initialize all global variables
    this.mouvementClassifiedIn = {};
    this.mouvementClassifiedOut = {};
    this.regulCharges = {};
    this.bienTotal = {};

    //First fill global variables with the list of biens (just the one requested or all if total is selected)
    this.documentService.document.biens.forEach( (bien:Bien) => {
      if(!bien.isImmeuble()){
        if(bien.nom == this.selectedBien || this.selectedBien == 'total'){
          this.mouvementClassifiedIn[bien.nom] = {};
          this.mouvementClassifiedOut[bien.nom] = {};
          this.regulCharges[bien.nom] = {chargeNonRecuperees: 0, chargeNonDeductible: 0, chargeTropPercu: 0};
          this.bienTotal[bien.nom] = {};
        }
      }
    });
    if(this.selectedBien == 'total'){
      this.bienTotal['total'] = {};
    }

    //First analyse all mouvements to get in and outs for each bien and for each year
    this.documentService.document.mouvements.forEach( (mouvement:Mouvement) => {

      //Le mouvement à analyser est par défaut le mouvement en train d'être parcouru
      let mouvementsToAnalyse: {
        montant: number,
        bien: string
      }[] = [{montant: mouvement.montant, bien: mouvement.bien.nom}];

      //SI le mouvement est celui d'un bien qui est un immeuble alors il faut ventiler tout aux biens lies
      if(mouvement.bien.isImmeuble()){
        mouvementsToAnalyse = [];
        //ON parcours donc chaque bien lie pour définir le montant ventilé et le bien à rattacher
        mouvement.bien.bienslies.forEach(bienlie => {
          mouvementsToAnalyse.push({montant: mouvement.montant * bienlie.ratio / 100, bien: bienlie.bien.nom})
        });
      }

      //Pour chaque mouvement à analyser ( 1 si bien non immeuble, n si immeuble avec n biens lies)
      mouvementsToAnalyse.forEach(mouvementToAnalyse => {

        // We just get mouvements for selected bien or for all if total is selected
        if(mouvementToAnalyse.bien == this.selectedBien || this.selectedBien == 'total'){

          //If objects are not initialized then initialize them first
          if(!this.mouvementClassifiedIn[mouvementToAnalyse.bien][mouvement.date.getFullYear()]){
            this.mouvementClassifiedIn[mouvementToAnalyse.bien][mouvement.date.getFullYear()] = {mouvements: {}, total: 0, charges: 0};
            this.txtIn.forEach((txt:string) => {
              this.mouvementClassifiedIn[mouvementToAnalyse.bien][mouvement.date.getFullYear()].mouvements[txt] = {liste:[], total: 0};
            });
          }
          if(!this.mouvementClassifiedOut[mouvementToAnalyse.bien][mouvement.date.getFullYear()]){
            this.mouvementClassifiedOut[mouvementToAnalyse.bien][mouvement.date.getFullYear()] =  {mouvements: {}, total: 0, charges: 0};
            this.txtOut.forEach((txt:string) => {
              this.mouvementClassifiedOut[mouvementToAnalyse.bien][mouvement.date.getFullYear()].mouvements[txt] = {liste:[], total: 0};
            });
          }

          //The variable to define if the mouvement can be categorized or must be add the default category
          var foundLibelle = false;

          //If this is an input
          if(mouvementToAnalyse.montant > 0){
            //Loop though all possibles texts to organise mouvements by categories
            this.txtIn.forEach( (txt:string) => {
              if(mouvement.libelle.toLowerCase().includes(txt.toLowerCase())){
                if(!this.isUndesiredCategory(txt)) {
                  //The loyer is a specific input that must be managed to separate charges from loyer
                  if(txt.toLowerCase().includes("loyer")){
                    var bail = this.getBailForMouvement(mouvement);
                    var montantLoyer = bail ? mouvementToAnalyse.montant - bail.charges : mouvementToAnalyse.montant;
                    this.mouvementClassifiedIn[mouvementToAnalyse.bien][mouvement.date.getFullYear()].mouvements[txt].liste.push({libelle:mouvement.toString(), montant:montantLoyer, fromImmeuble: false});
                    this.mouvementClassifiedIn[mouvementToAnalyse.bien][mouvement.date.getFullYear()].mouvements[txt].total += montantLoyer;
                    //On mémorise le montant des charges perçues
                    this.mouvementClassifiedIn[mouvementToAnalyse.bien][mouvement.date.getFullYear()].charges += bail ? bail.charges: 0;
                    this.mouvementClassifiedIn[mouvementToAnalyse.bien][mouvement.date.getFullYear()].total += montantLoyer;
                  }else{
                    this.mouvementClassifiedIn[mouvementToAnalyse.bien][mouvement.date.getFullYear()].mouvements[txt].liste.push({libelle:mouvement.toString(), montant: mouvementToAnalyse.montant, fromImmeuble: mouvementToAnalyse.montant!=mouvement.montant});
                    this.mouvementClassifiedIn[mouvementToAnalyse.bien][mouvement.date.getFullYear()].mouvements[txt].total += mouvementToAnalyse.montant;
                    this.mouvementClassifiedIn[mouvementToAnalyse.bien][mouvement.date.getFullYear()].total += mouvementToAnalyse.montant;
                  }
                }
                foundLibelle = true;
              }
            });
            // If the mouvement can not be categorized then put it in the default category
            if(!foundLibelle){
              this.mouvementClassifiedIn[mouvementToAnalyse.bien][mouvement.date.getFullYear()].mouvements[this.categorieAutre].liste.push({libelle:mouvement.toString(), montant: mouvementToAnalyse.montant, fromImmeuble: mouvementToAnalyse.montant!=mouvement.montant});
              this.mouvementClassifiedIn[mouvementToAnalyse.bien][mouvement.date.getFullYear()].mouvements[this.categorieAutre].total += mouvementToAnalyse.montant;
              this.mouvementClassifiedIn[mouvementToAnalyse.bien][mouvement.date.getFullYear()].total += mouvementToAnalyse.montant;
            }
          //If this is an output
          }else{
            //Loop through all possibles texts to organise mouvements by categories
            this.txtOut.forEach( (txt:string) => {
              if(mouvement.libelle.toLowerCase().includes(txt.toLowerCase())){
                if(!this.isUndesiredCategory(txt)) {
                  this.mouvementClassifiedOut[mouvementToAnalyse.bien][mouvement.date.getFullYear()].mouvements[txt].liste.push({libelle:mouvement.toString(), montant: mouvementToAnalyse.montant, fromImmeuble: mouvementToAnalyse.montant!=mouvement.montant});
                  this.mouvementClassifiedOut[mouvementToAnalyse.bien][mouvement.date.getFullYear()].mouvements[txt].total += mouvementToAnalyse.montant;
                  this.mouvementClassifiedOut[mouvementToAnalyse.bien][mouvement.date.getFullYear()].total += mouvementToAnalyse.montant;
                  //On mémorise le montant des charges payées
                  if(mouvement.libelle.toLowerCase().includes("charge")){
                    this.mouvementClassifiedOut[mouvementToAnalyse.bien][mouvement.date.getFullYear()].charges += mouvementToAnalyse.montant;
                  }
                }
                foundLibelle = true;
              }
            });
            // If the mouvement can not be categorized then put it in the default category
            if(!foundLibelle){
              this.mouvementClassifiedOut[mouvementToAnalyse.bien][mouvement.date.getFullYear()].mouvements[this.categorieAutre].liste.push({libelle:mouvement.toString(), montant: mouvementToAnalyse.montant, fromImmeuble: mouvementToAnalyse.montant!=mouvement.montant});
              this.mouvementClassifiedOut[mouvementToAnalyse.bien][mouvement.date.getFullYear()].mouvements[this.categorieAutre].total += mouvementToAnalyse.montant;
              this.mouvementClassifiedOut[mouvementToAnalyse.bien][mouvement.date.getFullYear()].total += mouvementToAnalyse.montant;
            }
          }
        }
      });
    });

    //Add the forfait accepted by default by the impots for each bien management
    for (let keyBien in this.mouvementClassifiedIn) {
      for (let keyYear in this.mouvementClassifiedOut[keyBien]) {
        this.mouvementClassifiedOut[keyBien][keyYear].mouvements["Autres frais de gestion"].liste.push({libelle:"Forfait gestion pour frais divers", montant: this.forfaitGestion});
        this.mouvementClassifiedOut[keyBien][keyYear].mouvements["Autres frais de gestion"].total += this.forfaitGestion;
        this.mouvementClassifiedOut[keyBien][keyYear].total += this.forfaitGestion;
      }
    }

    //Now that all mouvement are categorized compute the total for all categories and the total of the total if all biens are displayed
    for (let keyBien in this.mouvementClassifiedIn) {
      for (let keyYear in this.mouvementClassifiedIn[keyBien]) {
        //Initialize the object
        this.bienTotal[keyBien][keyYear] = {totalIn: 0, totalOut: 0, bestForfait: false};
        //Get mouvements
        const tmpIn = this.mouvementClassifiedIn[keyBien][keyYear];
        const tmpOut = this.mouvementClassifiedOut[keyBien][keyYear];
        //Transfer total previously computed into the total object
        this.bienTotal[keyBien][keyYear].totalIn = tmpIn.total;
        this.bienTotal[keyBien][keyYear].totalOut = tmpOut.total;
        //Compute whther it's better to choose real or micro-foncier deduction
        if(tmpIn.total * this.tauxMicroFoncier > -tmpOut.total){
          this.bienTotal[keyBien][keyYear].bestForfait = true;
        }
        //Also compute the total of all totals
        if(this.selectedBien == 'total'){
          if(!this.bienTotal['total'][keyYear]){
            this.bienTotal['total'][keyYear] = {totalIn: 0, totalOut: 0, bestForfait: false};
          }
          this.bienTotal['total'][keyYear].totalIn += tmpIn.total;
          this.bienTotal['total'][keyYear].totalOut += tmpOut.total;
        }
      }
    }

    //Now that the total of total is filled we can decide which regime is the best for the total
    for (let keyYear in this.bienTotal['total']) {
      if(this.bienTotal['total'][keyYear].totalIn * this.tauxMicroFoncier > -this.bienTotal['total'][keyYear].totalOut){
        this.bienTotal['total'][keyYear].bestForfait = true;
      }
    }

    //Computation is now fully ended
    this.computeEnded = true;
  }

  //Function used to get the pointage field of the CERFA document according to the computed catgeory
  public getPointage(txt:string): string{

    var returnStr = " "
    if(txt.toLowerCase().includes("assurance")){
      returnStr = "223";
    }
    if(txt.toLowerCase().includes("travaux")){
      returnStr = "224";
    }
    if(txt.toLowerCase().includes("achat")){
      returnStr = "224";
    }
    if(txt.toLowerCase().includes("taxe")){
      returnStr = "227";
    }
    if(txt.toLowerCase().includes("provision")){
      returnStr = "229";
    }
    if(txt.toLowerCase().includes("dossier")){
      returnStr = "250";
    }
    if(txt.toLowerCase().includes("intérêts")){
      returnStr = "250";
    }
    if(txt.toLowerCase().includes("garantie")){
      returnStr = "250";
    }
    if(txt.toLowerCase().includes("autres frais de gestion")){
      returnStr = "222";
    }
    return returnStr;
  }

  //Compute the total for each mouvement categories for all biens
  public getTotalForTxt(annee: number, typeTxt: string, txt: string){
    var total: number = 0;
    var mouvementClassified = typeTxt=='in'?this.mouvementClassifiedIn:this.mouvementClassifiedOut;
    for (let keyBien in mouvementClassified) {
      if(mouvementClassified[keyBien][annee])
      {
        total += mouvementClassified[keyBien][annee].mouvements[txt].total;
      }
    }
    return total;
  }

  //Compute the total for all recuperables charges of all biens
  public getChargesPercuesTotal(annee: number){
    var chargesRecuperables = 0
    for (let keyBien in this.mouvementClassifiedIn) {
      if(this.mouvementClassifiedIn[keyBien][annee]) {
        chargesRecuperables +=  this.mouvementClassifiedIn[keyBien][annee].charges;
      }
    }
    return chargesRecuperables;
  }
  //Compute the total for all recuperables charges of all biens
  public getChargesPayeesTotal(annee: number){
    var chargesRecuperables = 0
    for (let keyBien in this.mouvementClassifiedOut) {
      if(this.mouvementClassifiedOut[keyBien][annee]) {
        chargesRecuperables +=  this.mouvementClassifiedOut[keyBien][annee].charges;
      }
    }
    return chargesRecuperables;
  }

  //Compute the total for all non recupered charges of all biens
  public getChargesNonRecupereesTotal(){
    var chargeNonRecuperees = 0
    for (let keyBien in this.regulCharges) {
      chargeNonRecuperees +=  this.regulCharges[keyBien].chargeNonRecuperees;
    }
    return chargeNonRecuperees;
  }
  //Compute the total for all non deductibles charges of all biens
  public getChargesNonDeductiblesTotal(){
    var chargesNonDeductibles = 0
    for (let keyBien in this.regulCharges) {
      chargesNonDeductibles +=  this.regulCharges[keyBien].chargeNonDeductible;
    }
    return chargesNonDeductibles;
  }
  //Compute the total for all trop percus charges of all biens
  public getChargeTropPercuTotal(){
    var chargeTropPercu = 0
    for (let keyBien in this.regulCharges) {
      chargeTropPercu +=  this.regulCharges[keyBien].chargeTropPercu;
    }
    return chargeTropPercu;
  }

  //Compute the global regularisation charges values according to all possibles catgories of regularisation charges
  public getRegularisationCharges(bienNom: string){
    var charges:number = 0;
    this.documentService.document.biens.forEach( (bien:Bien) => {
      if(bien.nom == bienNom || bienNom == 'total'){
        if(this.regulCharges[bien.nom]){
          //Get the values input by the user
          charges -= this.regulCharges[bien.nom].chargeNonRecuperees; // Theses charges are negatives as they decrease our plus-values
          charges += this.regulCharges[bien.nom].chargeNonDeductible;
          charges += this.regulCharges[bien.nom].chargeTropPercu;
        }
        //If defined also add the amout of charges paied by the locataire
        if(this.mouvementClassifiedIn[bien.nom][this.selectedAnnee-2]){
          charges += this.mouvementClassifiedIn[bien.nom][this.selectedAnnee-2].charges;
        }
      }
    });
    return charges;
  }

  //Compute the final value to delcare according to choosen regime and charges to regularize
  public getValueToDeclare(bienNom: string, annee: number){

    var toDeclare: number = 0;

    if(this.bienTotal[bienNom][annee]){
      const tmpIn = this.bienTotal[bienNom][annee].totalIn;
      const tmpOut = this.bienTotal[bienNom][annee].totalOut;
      //Ask result for the micro-foncier
      if(this.selectedRegime == 2){
        toDeclare = tmpIn - tmpIn * this.tauxMicroFoncier;
      }
      //Ask result for the real so need to take into account the regularised charges
      if(this.selectedRegime == 1){
        toDeclare = tmpIn + tmpOut + this.getRegularisationCharges(bienNom)
      }
    }
    return toDeclare;
  }

  goBack(): void {
    this.location.back();
  }
}
