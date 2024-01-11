import { Component, OnInit, Input } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { FormGroup, FormControl, Validators } from '@angular/forms';

import { Bien } from '../_modeles/bien';
import { BIENTYPE as bienTypes } from '../_modeles/bien';
import { AlertService } from '../_services/alert.service';
import { DocumentService } from '../_services/document.service';

@Component({
  selector: 'app-bien-details',
  templateUrl: './bien-details.component.html',
  styleUrls: ['./bien-details.component.scss']
})
export class BienDetailsComponent implements OnInit {

  //Global form
  public bienForm: FormGroup;
  //The current bien
  public bien: Bien;
  //Conversion of bien types in text
  public bienTypes = bienTypes;
  //Store temporarily the list of bien lies;
  public biensLies: ({
    bien: Bien|null,
    ratio: number
  }|null)[] = []; 

  constructor(
    private route: ActivatedRoute,
    private alertService: AlertService,
    public documentService: DocumentService,
    private location: Location) { }

  ngOnInit(): void {
    this.bienForm = new FormGroup({
      'nom': new FormControl('', [
        Validators.required
      ]),
      'description': new FormControl('', [
        Validators.required
      ]),
      'type': new FormControl('', [
        Validators.required
      ]),
      'adresse': new FormControl('', [
        Validators.required
      ]),
      'proprietaire': new FormControl('', [
        Validators.required
      ]),
      'syndic': new FormControl(''),
      'syndicUrl': new FormControl(''),
      'dateFabrication': new FormControl(''),
      'dateAchat': new FormControl('', [
        Validators.required
      ]),
      'prixAchat': new FormControl('', [
        Validators.required,
        Validators.pattern('[0-9]*')
      ]),
      'surface': new FormControl('', [
        Validators.required,
        Validators.pattern('[0-9.,]*')
      ]),
      'nbPieces': new FormControl('', [
        Validators.pattern('[0-9]*')
      ]),
      'parking': new FormControl(''),
      'dateAssurance': new FormControl('', [
        Validators.required
      ]),
      'commentaire': new FormControl('')
    });
    this.getData();

    //If document is reloaded then get data again
    this.documentService.docIsLoadedChange.subscribe((isLoaded: boolean) => {
      if(isLoaded){
          this.getData();
      }
    });
  }

  get nom() { return this.bienForm.get('nom'); }
  get description() { return this.bienForm.get('description'); }
  get type() { return this.bienForm.get('type'); }
  get adresse() { return this.bienForm.get('adresse'); }
  get proprietaire() { return this.bienForm.get('proprietaire'); }
  get syndic() { return this.bienForm.get('syndic'); }
  get syndicUrl() { return this.bienForm.get('syndicUrl'); }
  get dateFabrication() { return this.bienForm.get('dateFabrication'); }
  get dateAchat() { return this.bienForm.get('dateAchat'); }
  get prixAchat() { return this.bienForm.get('prixAchat'); }
  get surface() { return this.bienForm.get('surface'); }
  get nbPieces() { return this.bienForm.get('nbPieces'); }
  get parking() { return this.bienForm.get('parking'); }
  get dateAssurance() { return this.bienForm.get('dateAssurance'); }
  get commentaire() { return this.bienForm.get('commentaire'); }

  getData(): void {
    //Get parameter id to check if it's new or existing
    const reqId = this.route.snapshot.paramMap.get('_id');
    //If an existing one is edited
    if(reqId != 'new'){
      //Look for the requested one in the list
      for (var _i = 0; _i < this.documentService.document.biens.length; _i++) {
        // Find the requested one
        if(this.documentService.document.biens[_i].id == reqId){
          this.bien = this.documentService.document.biens[_i];
        }
      }
      this.bienForm.patchValue({
        nom: this.bien.nom,
        description: this.bien.description,
        type: this.bien.type,
        adresse: this.bien.adresse,
        proprietaire: this.bien.proprietaire.id,
        syndic: this.bien.syndic,
        syndicUrl: this.bien.syndicUrl,
        dateFabrication: this.bien.dateFabrication,
        dateAchat: this.bien.dateAchat,
        prixAchat: this.bien.prixAchat,
        surface: this.bien.surface,
        nbPieces: this.bien.nbPieces,
        parking: this.bien.parking,
        dateAssurance: this.bien.dateAssurance,
        commentaire: this.bien.commentaire
      });
  
      // If the requested one can not be found (normally impossible) go back;
      if(!this.bien){
        this.goBack();
        this.alertService.error('Impossible de trouver le bien demandé !');
      }

      //If the bien is an immeuble and if it has linked biens
      this.biensLies = [];
      if(this.bien.isImmeuble() && this.bien.bienslies.length > 0){
        for (var _i = 0; _i < this.bien.bienslies.length; _i++) {
          this.addBienLie(this.bien.bienslies[_i]);
        }
      }

    // New one requested
    }else{
      this.bienForm.patchValue({
          nom: '',
          description: '',
          type: 'Vide',
          adresse: '',
          proprietaire: '',
          syndic: null,
          syndicUrl: null,
          dateFabrication: '',
          dateAchat: '',
          prixAchat: 0,
          surface: 0,
          nbPieces: null,
          parking: '',
          dateAssurance: '',
          commentaire: null
        });
    }
  }

  save(): void {
    //Save or updated depending
    const reqId = this.route.snapshot.paramMap.get('_id') || '';
    // IF not new, found existing and replace it
    if(reqId != 'new'){
      //We backup the pieces before updating the bien
      const tmpPieces = this.bien.pieces;
      //We update with new values from form 
      this.bien = Bien.fromJSON(this.bienForm.value, this.documentService.document.bailleurs);
      //Set the id with the requested id
      this.bien.id = reqId;
      //Add the pieces previsously backedup
      this.bien.pieces = tmpPieces;
      //Now linked the biens if existed
      for (var _i = 0; _i < this.biensLies.length; _i++) {
        if(this.biensLies[_i] && this.biensLies[_i]!.bien){
          this.bien.bienslies.push({
            bien: this.biensLies[_i]!.bien as any,
            ratio: this.biensLies[_i]!.ratio
          })
        }
      }

      //Then we update in the list
      for (var _i = 0; _i < this.documentService.document.biens.length; _i++) {
        if(this.documentService.document.biens[_i].id == this.bien.id){
          this.documentService.document.biens[_i] = this.bien;
          console.log("Modification realised.")
        }
      }
      this.alertService.success('Le bien est maintenant modifié.');
    // If new push it at the end
    }else{
      //Check if this bien is compliant
      if(this.documentService.checkBien(this.bienForm.value, true)){
        //Create a bien from form values
        let tmpNew: Bien = Bien.fromJSON(this.bienForm.value, this.documentService.document.bailleurs);
        //Generate a new UUID
        tmpNew.id = this.documentService.getUniqueId(4);
        //Now linked the biens if existed
        for (var _i = 0; _i < this.biensLies.length; _i++) {
          if(this.biensLies[_i] && this.biensLies[_i]!.bien){
            tmpNew.bienslies.push({
              bien: this.biensLies[_i]!.bien as any,
              ratio: this.biensLies[_i]!.ratio
            })
          }
        }
        //Add the bien in the document
        this.documentService.document.biens.push(tmpNew);
        
        //Final actions
        this.alertService.success('Le bien est maintenant ajouté.');
        this.goBack();
      }
    }
  }

  public addBienLie(bienLie: any = null){
    //Add the new bien lie in the list of biens lies
    this.biensLies.push({
      bien: bienLie?bienLie.bien:null,
      ratio: bienLie?bienLie.ratio:0
    });
    //Add the control for this bien linked
    this.bienForm.addControl('bienlie_' + (this.biensLies.length-1) + '_bien', new FormControl('', [Validators.required]));
    this.bienForm.addControl('bienlie_' + (this.biensLies.length-1) + "_ratio", new FormControl('', [Validators.required,Validators.pattern('[0-9.,]*')]));
    //Prefilled control with the value
    this.bienForm.controls['bienlie_' + (this.biensLies.length-1) + '_bien'].patchValue(this.biensLies[this.biensLies.length-1]?.bien?.id);
    this.bienForm.controls['bienlie_' + (this.biensLies.length-1) + '_ratio'].patchValue(this.biensLies[this.biensLies.length-1]?.ratio);
  }

  public removeBienLie(index: number){
    //Set the linked bien as null (do not remve it otherwise the control name systme won't work any more)
    this.biensLies[index] = null;
    //Remove the control (in this way the validators won't raised any more)
    this.bienForm.removeControl('bienlie_' + index + '_bien');
    this.bienForm.removeControl('bienlie_' + index + '_ratio');
    //Update Ratio computation as a bien has been removed
    this.updateRatio();
  }

  public updateBienLie(event: any, index: number){

    //Select has changed so try to find the bien according to select value (id of the bien)
    for (var _i = 0; _i < this.documentService.document.biens.length; _i++) {
      //The bien has been found in the list
      if(this.documentService.document.biens[_i].id == event.value){
        //Update the field with the bien found
        this.biensLies[index]!.bien = this.documentService.document.biens[_i];
      }
    }

    //Update Ratio computation
    this.updateRatio();
  }

  public updateBienLieRatio(event: any, index: number){
    //We just update the ratio in the model but we don't recompute the ratio as it will erase the value input by the user
    this.biensLies[index]!.ratio = Math.round(event.target.value);
  }

  public updateRatio(){

    //Loop through all biens lies first to get the maximum
    let maximum:number = 0;
    for (var _i = 0; _i < this.biensLies.length; _i++) {
      if(this.biensLies[_i]){
        if(this.biensLies[_i]!.bien){
          maximum += this.biensLies[_i]!.bien!.surface;
        }
      }
    }

    //Now maximum is know compute the ratio for each bien linked
    for (var _i = 0; _i < this.biensLies.length; _i++) {
      if(this.biensLies[_i]){
        if(this.biensLies[_i]!.bien){
          //Compute ratio
          this.biensLies[_i]!.ratio = Math.round(this.biensLies[_i]!.bien!.surface/maximum * 100 * 10) / 10;
          //Then update the field with the new value
          this.bienForm.controls['bienlie_' + (_i) + '_ratio'].patchValue(this.biensLies[_i]!.ratio);
        }
      }
    }
  }

  public isRatioCompliant(): boolean{
    let sumRatio: number = 0;
    for (var _i = 0; _i < this.biensLies.length; _i++) {
      if(this.biensLies[_i]){
        sumRatio+= this.biensLies[_i]!.ratio;
      }
    }
    return Math.round(sumRatio) == 100;
  }

  goBack(): void {
    this.location.back();
  }

}
