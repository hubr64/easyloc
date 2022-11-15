import { Component, OnInit, Input } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';

import { Locataire } from '../_modeles/locataire';
import { AlertService } from '../_services/alert.service';
import { DocumentService } from '../_services/document.service';
import { DriveService } from '../_services/drive.service';

@Component({
  selector: 'app-locataire-details',
  templateUrl: './locataire-details.component.html',
  styleUrls: ['./locataire-details.component.scss']
})
export class LocataireDetailsComponent implements OnInit {
 
  //Global form
  public locataireForm: FormGroup;
  //The current locataire
  public locataire: Locataire;

  constructor(
    private router: Router,
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private alertService: AlertService,
    private documentService: DocumentService,
    private driveService: DriveService,
    private location: Location) { }

  ngOnInit(): void {
    this.locataireForm = new FormGroup({
      'nom': new FormControl('', [
        Validators.required
      ]),
      'telephone': new FormControl('', [
        Validators.required,
        Validators.pattern('[0-9]*')
      ]),
      'mail': new FormControl('', [
        Validators.required,
        Validators.pattern('[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+')
      ]),
      'commentaire': new FormControl('')
    });
    this.getData();
  }

  get nom() { return this.locataireForm.get('nom'); }
  get telephone() { return this.locataireForm.get('telephone'); }
  get mail() { return this.locataireForm.get('mail'); }
  get commentaires() { return this.locataireForm.get('commentaire'); }

  getData(): void {
    //Get parameter id to check if it's new or existing
    const reqId = this.route.snapshot.paramMap.get('_id');
    //If an existing one is edited
    if(reqId != 'new'){
      //Look for the requested one in the list
      for (var _i = 0; _i < this.documentService.document.locataires.length; _i++) {
        // Find the requested one
        if(this.documentService.document.locataires[_i].id == reqId){
          this.locataire = this.documentService.document.locataires[_i];
        }
      }
      this.locataireForm.patchValue({
        nom: this.locataire.nom,
        telephone: this.locataire.telephone,
        mail: this.locataire.mail,
        commentaire: this.locataire.commentaire
      });

      // If the requseted one can not be found (normally impossible) go back;
      if(!this.locataire){
        this.goBack();
        this.alertService.error('Impossible de trouver le locataire demandé !');
      }
    // New one requested
    }else{
      this.locataireForm.patchValue({
          nom: "",
          telephone: "",
          mail: "",
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
      const tmpPieces = this.locataire.pieces;
      this.locataire = Locataire.fromJSON(this.locataireForm.value);
      this.locataire.id = reqId;
      this.locataire.pieces = tmpPieces;
      //Then we update in the list
      for (var _i = 0; _i < this.documentService.document.locataires.length; _i++) {
        if(this.documentService.document.locataires[_i].id == this.locataire.id){
          this.documentService.document.locataires[_i] = this.locataire;
          console.log("Modification realised.")
        }
      }
      this.alertService.success('Le locataire est maintenant modifié.');
    // If new push it at the end
    }else{
      if(this.documentService.checkLocataire(this.locataireForm.value, true)){
        let tmpNew: Locataire = Locataire.fromJSON(this.locataireForm.value);
        tmpNew.id = this.documentService.getUniqueId(4);
        this.documentService.document.locataires.push(tmpNew);
        this.alertService.success('Le locataire est maintenant ajouté.');
        this.goBack();
      }
    }
  }

  goBack(): void {
    this.location.back();
  }

}
