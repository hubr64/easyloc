import { Component, OnInit, Input, ViewChild, ElementRef } from '@angular/core';
import { Location } from '@angular/common';

import { MAT_RADIO_DEFAULT_OPTIONS} from '@angular/material/radio';

import { Bien } from '../_modeles/bien';
import { Mouvement } from '../_modeles/mouvement';
import { Bail } from '../_modeles/bail';
import { AlertService } from '../_services/alert.service';
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

  //Varible to store all years to ask to user
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

  //Forfait used for the micro-foncier regime (modified after by configuration)
  public forfaitDeduction: number = 0.3;
  //The name of the category to group all uncategorized mouvements
  public categorieAutre = "Autre";
  // All in mouvements classified for each bien by each year
  public mouvementClassifiedIn: MouvementClassified;
  public mouvementClassifiedOut: MouvementClassified;
  // An object to get sum up total for each bien and the total sumup of all biens (column total)
  public bienTotal: BienTotal;

  constructor(
    private alertService: AlertService,
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
    //Get forfait of micro-foncier from configuration
    this.forfaitDeduction = parseFloat(this.configurationService.getValue('impotDeductionForfaitaire'));
  }

  ngOnInit(): void {
    //Initialise the default selected values in the form which is previous year by default
    this.selectedAnnee = new Date().getFullYear()-1;
    if(this.defaultBien){
      this.selectedBien = this.defaultBien.nom;
    }else{
      this.selectedBien = "total";
    }
  }

  //Fonction to come back to glbal configuration generation
  reset(){
    this.computeEnded = false;
  }

  //Fonction to get the loyer without charges of a mouvement corresponding to a loyer paiement (as for taxes both values need to be separated)
  private getLoyerForMouvement(mouvement: Mouvement): number{
    var loyer = 0;
    //Look into all bails to find the bien of the mouvement
    this.documentService.document.bails.forEach( (bail:Bail) => {
      //If the bail correspond to the mouvement (good bien and good dates) then we have found good bail
      if(bail.bien == mouvement.bien && bail.dateDebut <= mouvement.date && (!bail.dateFin || bail.dateFin >= mouvement.date )){
        //Get the loyer of the found bail
        loyer = bail.loyer;
      }
    });
    return loyer;
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
      if(bien.nom == this.selectedBien || this.selectedBien == 'total'){
        this.mouvementClassifiedIn[bien.nom] = {};
        this.mouvementClassifiedOut[bien.nom] = {};
        this.regulCharges[bien.nom] = {chargeNonDeductible: 0, chargeTropPercu: 0};
        this.bienTotal[bien.nom] = {};
      }
    });
    if(this.selectedBien == 'total'){
      this.bienTotal['total'] = {};
    }

    //First analyse all mouvements to get in and outs for each bien and for each year
    this.documentService.document.mouvements.forEach( (mouvement:Mouvement) => {

      // We just get mouvements for selected bien or for all if total is selected
      if(mouvement.bien.nom == this.selectedBien || this.selectedBien == 'total'){

        //If objects are not initialized then initialize them first
        if(!this.mouvementClassifiedIn[mouvement.bien.nom][mouvement.date.getFullYear()]){
          this.mouvementClassifiedIn[mouvement.bien.nom][mouvement.date.getFullYear()] = {mouvements: {}, total: 0, charges: 0};
          this.txtIn.forEach((txt:string) => {
            this.mouvementClassifiedIn[mouvement.bien.nom][mouvement.date.getFullYear()].mouvements[txt] = {liste:[], total: 0};
          });
        }
        if(!this.mouvementClassifiedOut[mouvement.bien.nom][mouvement.date.getFullYear()]){
          this.mouvementClassifiedOut[mouvement.bien.nom][mouvement.date.getFullYear()] =  {mouvements: {}, total: 0, charges: 0};
          this.txtOut.forEach((txt:string) => {
            this.mouvementClassifiedOut[mouvement.bien.nom][mouvement.date.getFullYear()].mouvements[txt] = {liste:[], total: 0};
          });
        }

        //The variable to define if the mouvement can be categorized or must be add the default category
        var foundLibelle = false;

        //If this is an input
        if(mouvement.montant > 0){
          //Loop thourgh all possibles texts to organise mouvements by categories
          this.txtIn.forEach( (txt:string) => {
            if(mouvement.libelle.toLowerCase().includes(txt.toLowerCase())){

              //The loyer is a specific input that must be managed to seprate charges from loyer
              if(txt.toLowerCase().includes("loyer")){
                var loyer = this.getLoyerForMouvement(mouvement);
                this.mouvementClassifiedIn[mouvement.bien.nom][mouvement.date.getFullYear()].mouvements[txt].liste.push({libelle:mouvement.libelle, montant: loyer});
                this.mouvementClassifiedIn[mouvement.bien.nom][mouvement.date.getFullYear()].mouvements[txt].total += loyer;
                this.mouvementClassifiedIn[mouvement.bien.nom][mouvement.date.getFullYear()].charges += mouvement.montant - loyer;
                this.mouvementClassifiedIn[mouvement.bien.nom][mouvement.date.getFullYear()].total += loyer;
              }else{
                this.mouvementClassifiedIn[mouvement.bien.nom][mouvement.date.getFullYear()].mouvements[txt].liste.push({libelle:mouvement.libelle, montant: mouvement.montant});
                this.mouvementClassifiedIn[mouvement.bien.nom][mouvement.date.getFullYear()].mouvements[txt].total += mouvement.montant;
                this.mouvementClassifiedIn[mouvement.bien.nom][mouvement.date.getFullYear()].total += mouvement.montant;
              }
              foundLibelle = true;
            }
          });
          // If the mouvement can not be categorized then put it in the default category
          if(!foundLibelle){
            this.mouvementClassifiedIn[mouvement.bien.nom][mouvement.date.getFullYear()].mouvements[this.categorieAutre].liste.push({libelle:mouvement.libelle, montant: mouvement.montant});
            this.mouvementClassifiedIn[mouvement.bien.nom][mouvement.date.getFullYear()].mouvements[this.categorieAutre].total += mouvement.montant;
            this.mouvementClassifiedIn[mouvement.bien.nom][mouvement.date.getFullYear()].total += mouvement.montant;
          }
        //If this is an output
        }else{
          //Loop thourgh all possibles texts to organise mouvements by categories
          this.txtOut.forEach( (txt:string) => {
            if(mouvement.libelle.toLowerCase().includes(txt.toLowerCase())){
              this.mouvementClassifiedOut[mouvement.bien.nom][mouvement.date.getFullYear()].mouvements[txt].liste.push({libelle:mouvement.libelle, montant: mouvement.montant});
              this.mouvementClassifiedOut[mouvement.bien.nom][mouvement.date.getFullYear()].mouvements[txt].total += mouvement.montant;
              foundLibelle = true;
            }
          });
          // If the mouvement can not be categorized then put it in the default category
          if(!foundLibelle){
            this.mouvementClassifiedOut[mouvement.bien.nom][mouvement.date.getFullYear()].mouvements[this.categorieAutre].liste.push({libelle:mouvement.libelle, montant: mouvement.montant});
            this.mouvementClassifiedOut[mouvement.bien.nom][mouvement.date.getFullYear()].mouvements[this.categorieAutre].total += mouvement.montant;
          }

          this.mouvementClassifiedOut[mouvement.bien.nom][mouvement.date.getFullYear()].total += mouvement.montant;
        }
      }
    });


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
        if(tmpIn.total * this.forfaitDeduction > -tmpOut.total){
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
      if(this.bienTotal['total'][keyYear].totalIn * this.forfaitDeduction > -this.bienTotal['total'][keyYear].totalOut){
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
    if(txt.toLowerCase().includes("autre")){
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
    if(txt.toLowerCase().includes("frais")){
      returnStr = "250";
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
  public getChargesRecuperablesTotal(annee: number){
    var chargesRecuperables = 0
    for (let keyBien in this.mouvementClassifiedIn) {
      if(this.mouvementClassifiedIn[keyBien][annee]) {
        chargesRecuperables +=  this.mouvementClassifiedIn[keyBien][annee].charges;
      }
    }
    return chargesRecuperables;
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
    var charges = 0;
    this.documentService.document.biens.forEach( (bien:Bien) => {
      if(bien.nom == bienNom || bienNom == 'total'){
        if(this.regulCharges[bien.nom]){
          //Get the two values input by the user
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
        toDeclare = tmpIn - tmpIn * this.forfaitDeduction;
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
