import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatDialog} from '@angular/material/dialog';

import { Bailleur, BailleurType } from '../_modeles/bailleur';
import { AlertService } from '../_services/alert.service';
import { DocumentService } from '../_services/document.service';
import { DriveService } from '../_services/drive.service';
import { UploadComponent } from '../upload/upload.component';

@Component({
  selector: 'app-bailleur-details',
  templateUrl: './bailleur-details.component.html',
  styleUrls: ['./bailleur-details.component.scss']
})
export class BailleurDetailsComponent implements OnInit {

  //Global form
  public bailleurForm: FormGroup;
  //The current bailleur
  public bailleur: Bailleur;
  // Signature image
  public signatureImage: any = '';

  constructor(
    private cdRef: ChangeDetectorRef,
    private router: Router,
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private alertService: AlertService,
    public documentService: DocumentService,
    private driveService: DriveService,
    private location: Location,
    public dialog: MatDialog) { }

  ngOnInit(): void {
    this.bailleurForm = new FormGroup({
      'nom': new FormControl('', [
        Validators.required
      ]),
      'type': new FormControl('', [
        Validators.required
      ]),
      'adresse': new FormControl('', [
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
      'signature': new FormControl('', [
        Validators.required
      ]),
      'immatriculation': new FormControl(''),
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

  get nom() { return this.bailleurForm.get('nom'); }
  get type() { return this.bailleurForm.get('type'); }
  get adresse() { return this.bailleurForm.get('adresse'); }
  get telephone() { return this.bailleurForm.get('telephone'); }
  get mail() { return this.bailleurForm.get('mail'); }
  get signature() { return this.bailleurForm.get('signature'); }
  get immatriculation() { return this.bailleurForm.get('immatriculation'); }
  get commentaires() { return this.bailleurForm.get('commentaire'); }

  getData(): void {
    //Get parameter id to check if it's new or existing
    const reqId = this.route.snapshot.paramMap.get('_id');
    //If an existing one is edited
    if(reqId != 'new'){
      //Look for the requested one in the list
      for (var _i = 0; _i < this.documentService.document.bailleurs.length; _i++) {
        // Find the requested one
        if(this.documentService.document.bailleurs[_i].id == reqId){
          this.bailleur = this.documentService.document.bailleurs[_i];
        }
      }
      this.bailleurForm.patchValue({
        nom: this.bailleur.nom,
        type: this.bailleur.type,
        adresse: this.bailleur.adresse,
        telephone: this.bailleur.telephone,
        mail: this.bailleur.mail,
        immatriculation: this.bailleur.immatriculation,
        signature: this.bailleur.signature,
        commentaire: this.bailleur.commentaire
      });

      // Get the signature thumbnail to display it (signature is mandatory)
      this.driveService.get(this.bailleur.signature).then( (response: any) => {
        this.signatureImage = response.result.thumbnailLink;
        this.cdRef.detectChanges();
      });

      // If the requseted one can not be found (normally impossible) go back;
      if(!this.bailleur){
        this.goBack();
        this.alertService.error('Impossible de trouver le bailleur demandé !');
      }
    // New one requested
    }else{
      this.bailleurForm.patchValue({
          nom: "",
          type: BailleurType.Physique,
          adresse: "",
          telephone: "",
          mail: "",
          immatriculation: null,
          signature: "",
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
      const tmpPieces = this.bailleur.pieces;
      this.bailleur = Bailleur.fromJSON(this.bailleurForm.value);
      this.bailleur.id = reqId;
      this.bailleur.pieces = tmpPieces;
      //Then we update in the list
      for (var _i = 0; _i < this.documentService.document.bailleurs.length; _i++) {
        if(this.documentService.document.bailleurs[_i].id == this.bailleur.id){
          this.documentService.document.bailleurs[_i] = this.bailleur;
          console.log("Modification realised.")
        }
      }
      this.alertService.success('Le bailleur est maintenant modifié.');
    // If new push it at the end
    }else{
      if(this.documentService.checkBailleur(this.bailleurForm.value, true)){
        let tmpNew: Bailleur = Bailleur.fromJSON(this.bailleurForm.value);
        tmpNew.id = this.documentService.getUniqueId(4);
        this.documentService.document.bailleurs.push(tmpNew);
        this.alertService.success('Le bailleur est maintenant ajouté.');
        this.goBack();
      }
    }
  }

  uploadSignature(){
    //Display a dialog to choose a file for the signature
    const dialogRef = this.dialog.open(UploadComponent, {
      data: {
        multiple: false //Only one possible
      }
    });

    dialogRef.afterClosed().subscribe((result:any) => {
      //If user has choosed a file
      if(result){
        //If only one file and a fileId is provided
        if(result.length == 1 && result[0].fileId){
          //If this is an image
          if(result[0].type.indexOf("image") != -1 ){
            // Get the thumbnail for displaying the signature image
            this.driveService.get(result[0].fileId).then( (response: any) => {
              this.signatureImage = response.result.thumbnailLink;
              this.cdRef.detectChanges();
            });
            //Set the signature file id in the field
            this.bailleurForm.patchValue({signature: result[0].fileId});
            // Do not memorize signature as a piece just keep the file ID
          }else{
            this.alertService.error('Le fichier choisi n\'est pas une image...');
          }
        }else{
          this.alertService.error('Une erreur est survenue et la signature n\'a pas été attribuée...');
        }
      }else{
        this.alertService.error('Aucun fichier de signature choisi...');
      }
    });
  }

  clearSignature(){
    this.bailleurForm.patchValue({signature: ''});
    this.signatureImage = '';
  }

  goBack(): void {
    this.location.back();
  }

}
