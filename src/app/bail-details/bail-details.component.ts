import { Component, OnInit, Input } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';

import { Bail } from '../_modeles/bail';
import { BAILTERMEPAIEMENT as bailTermePaiements } from '../_modeles/bail';
import { BAILTYPEPAIEMENT as bailTypePaiements } from '../_modeles/bail';
import { BAILPERIODEPAIEMENT as bailPeriodePaiements } from '../_modeles/bail';
import { AlertService } from '../_services/alert.service';
import { DocumentService } from '../_services/document.service';
import { DriveService } from '../_services/drive.service';

@Component({
  selector: 'app-bail-details',
  templateUrl: './bail-details.component.html',
  styleUrls: ['./bail-details.component.scss']
})
export class BailDetailsComponent implements OnInit {

  //Global form
  public bailForm: FormGroup;
  //The current bail
  public bail: Bail;
  //Conversion of types in text
  public bailTermePaiements = bailTermePaiements;
  public bailTypePaiements = bailTypePaiements;
  public bailPeriodePaiements = bailPeriodePaiements;

  constructor(
    private router: Router,
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private alertService: AlertService,
    public documentService: DocumentService,
    private driveService: DriveService,
    private location: Location) { }

  ngOnInit(): void {
    this.bailForm = new FormGroup({
      'locataire': new FormControl('', [
        Validators.required
      ]),
      'bien': new FormControl('', [
        Validators.required
      ]),
      'dateDebut': new FormControl('', [
        Validators.required
      ]),
      'dateFin': new FormControl(''),
      'duree': new FormControl('', [
        Validators.required,
        Validators.pattern('[0-9]*')
      ]),
      'loyer': new FormControl('', [
        Validators.required,
        Validators.pattern('[0-9.,]*')
      ]),
      'charges': new FormControl('', [
        Validators.required,
        Validators.pattern('[0-9.,]*')
      ]),
      'dateRevisionLoyer': new FormControl(''),
      'paiementPeriodicite': new FormControl('', [
        Validators.required
      ]),
      'paiementTerme': new FormControl('', [
        Validators.required
      ]),
      'paiementDate': new FormControl('', [
        Validators.required
      ]),
      'paiementType': new FormControl('', [
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

  get locataire() { return this.bailForm.get('locataire'); }
  get bien() { return this.bailForm.get('bien'); }
  get dateDebut() { return this.bailForm.get('dateDebut'); }
  get dateFin() { return this.bailForm.get('dateFin'); }
  get duree() { return this.bailForm.get('duree'); }
  get loyer() { return this.bailForm.get('loyer'); }
  get charges() { return this.bailForm.get('charges'); }
  get dateRevisionLoyer() { return this.bailForm.get('dateRevisionLoyer'); }
  get paiementPeriodicite() { return this.bailForm.get('paiementPeriodicite'); }
  get paiementTerme() { return this.bailForm.get('paiementTerme'); }
  get paiementDate() { return this.bailForm.get('paiementDate'); }
  get paiementType() { return this.bailForm.get('paiementType'); }
  get commentaire() { return this.bailForm!.get('commentaire'); }

  getData(): void {
    //Get parameter id to check if it's new or existing
    const reqId = this.route.snapshot.paramMap.get('_id');
    //If an existing one is edited
    if(reqId != 'new'){
      //Look for the requested one in the list
      for (var _i = 0; _i < this.documentService.document.bails.length; _i++) {
        // Find the requested one
        if(this.documentService.document.bails[_i].id == reqId){
          this.bail = this.documentService.document.bails[_i];
        }
      }
      this.bailForm.patchValue({
        bien: this.bail.bien.id,
        locataire: this.bail.locataire.id,
        dateDebut: this.bail.dateDebut,
        dateFin: this.bail.dateFin,
        duree: this.bail.duree,
        loyer: this.bail.loyer,
        charges: this.bail.charges,
        dateRevisionLoyer: this.bail.dateRevisionLoyer,
        paiementPeriodicite: this.bail.paiementPeriodicite,
        paiementTerme: this.bail.paiementTerme,
        paiementDate: this.bail.paiementDate,
        paiementType: this.bail.paiementType,
        commentaire: this.bail.commentaire
      });
  
      // If the requseted one can not be found (normally impossible) go back;
      if(!this.bail){
        this.goBack();
        this.alertService.error('Impossible de trouver le bail demandé !');
      }
    // New one requested
    }else{
      this.bailForm.patchValue({
        bien: '',
        locataire: '',
        dateDebut: new Date(),
        dateFin: null,
        duree: 3,
        loyer: 0,
        charges: 0,
        dateRevisionLoyer: '',
        paiementPeriodicite: 'mensuel',
        paiementTerme: 'echoir',
        paiementDate: null,
        paiementType: 'virement',
        commentaire: null
      });
    }
  }

  save(): void {
    //Save or updated depending
    const reqId = this.route.snapshot.paramMap.get('_id') || '';

    //TODO : Various check (date coherence)

    // IF not new, found existing and replace it
    if(reqId != 'new'){
      //We update with new values from form and we backup the pieces
      const tmpPieces = this.bail.pieces;
      this.bail = Bail.fromJSON(this.bailForm.value, this.documentService.document.locataires, this.documentService.document.biens);
      this.bail.id = reqId;
      this.bail.pieces = tmpPieces;
      //Then we update in the list
      for (var _i = 0; _i < this.documentService.document.bails.length; _i++) {
        if(this.documentService.document.bails[_i].id == this.bail.id){
          this.documentService.document.bails[_i] = this.bail;
          console.log("Modification realised.")
        }
      }
      this.alertService.success('Le bail est maintenant modifié.');
    // If new push it at the end
    }else{
      if(this.documentService.checkBail(this.bailForm.value, true)){
        let tmpNew: Bail = Bail.fromJSON(this.bailForm.value, this.documentService.document.locataires, this.documentService.document.biens);
        tmpNew.id = this.documentService.getUniqueId(4);
        this.documentService.document.bails.push(tmpNew);
        this.alertService.success('Le bail est maintenant ajouté.');
        this.goBack();
      }
    }
  }

  goBack(): void {
    this.location.back();
  }

}
