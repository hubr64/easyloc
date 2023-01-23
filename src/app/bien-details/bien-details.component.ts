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
  
      // If the requseted one can not be found (normally impossible) go back;
      if(!this.bien){
        this.goBack();
        this.alertService.error('Impossible de trouver le bien demandé !');
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
      //We update with new values from form and we backup the pieces
      const tmpPieces = this.bien.pieces;
      this.bien = Bien.fromJSON(this.bienForm.value, this.documentService.document.bailleurs);
      this.bien.id = reqId;
      this.bien.pieces = tmpPieces;
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
      if(this.documentService.checkBien(this.bienForm.value, true)){
        let tmpNew: Bien = Bien.fromJSON(this.bienForm.value, this.documentService.document.bailleurs);
        tmpNew.id = this.documentService.getUniqueId(4);
        this.documentService.document.biens.push(tmpNew);
        this.alertService.success('Le bien est maintenant ajouté.');
        this.goBack();
      }
    }
  }

  goBack(): void {
    this.location.back();
  }

}
