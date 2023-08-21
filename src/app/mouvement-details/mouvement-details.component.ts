import { Component, OnInit, Inject } from '@angular/core';
import { MAT_DIALOG_DATA} from '@angular/material/dialog';
import { FormGroup, FormControl, Validators, ValidatorFn, ValidationErrors, AbstractControl } from '@angular/forms';
import { Observable} from 'rxjs';
import { map, startWith} from 'rxjs/operators';

import { DocumentService } from '../_services/document.service';
import { ConfigurationService } from '../_services/configuration.service';
import { Bail } from '../_modeles/bail';
import { Bien } from '../_modeles/bien';

@Component({
  selector: 'app-mouvement-details',
  templateUrl: './mouvement-details.component.html',
  styleUrls: ['./mouvement-details.component.scss']
})
export class MouvementDetailsComponent implements OnInit {

  //Global form
  public mouvementForm: FormGroup;
  //Default proposed libelles
  public libellesAuto: string[];
  public libellesAutoFiltered: Observable<string[]>;

  constructor(
    public documentService: DocumentService,
    public configurationService: ConfigurationService,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) { 
    //Get list of libelles for in or out mouvements
    const In = this.configurationService.getValue('mouvementAutoCompleteIn').split(";");
    const Out = this.configurationService.getValue('mouvementAutoCompleteOut').split(";");
    //Concatenate both lists together
    this.libellesAuto = In.concat(Out); 
    // Supprimer les doublons en utilisant un Set
    this.libellesAuto = [...new Set(this.libellesAuto)];
    //Sort list alphabetically
    this.libellesAuto = this.libellesAuto.sort();
  }

  ngOnInit(): void {

    this.mouvementForm = new FormGroup({
      'date': new FormControl('', [
        Validators.required
      ],),
      'bien': new FormControl('', [
        Validators.required
      ]),
      'libelle': new FormControl('', [
        Validators.required
      ]),
      'montant': new FormControl(this.data.contenu, [
        Validators.required,
        Validators.pattern('[0-9.-]*')
      ]),
      'tiers': new FormControl('', [
        Validators.required
      ]),
      'commentaires': new FormControl('')
    });

    this.libellesAutoFiltered = this.mouvementForm.get('libelle')!.valueChanges.pipe(
      startWith(''),
      map((value: any) => this._filter(value)),
    );

    this.getData();

    // Subscribe in case the document was reloaded
    this.documentService.docIsLoadedChange.subscribe((isLoaded: boolean) => {
      if(isLoaded){
        this.getData();
      }
    });
  }

  private _filter(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.libellesAuto.filter(libelleAuto => libelleAuto.toLowerCase().includes(filterValue));
  }

  get date() { return this.mouvementForm.get('date'); }
  get bien() { return this.mouvementForm.get('bien'); }
  get libelle() { return this.mouvementForm.get('libelle'); }
  get montant() { return this.mouvementForm.get('montant'); }
  get tiers() { return this.mouvementForm.get('tiers'); }
  get commentaires() { return this.mouvementForm.get('commentaires'); }

  getData(): void {
    //If an existing one is edited
    if(this.data.mouvement){
      this.mouvementForm.patchValue({
        date: this.data.mouvement.date,
        bien: this.data.mouvement.bien.id,
        libelle: this.data.mouvement.libelle,
        montant: parseFloat(this.data.mouvement.montant),
        tiers: this.data.mouvement.tiers,
        commentaires: this.data.mouvement.commentaires
      });

    // New one requested
    }else{
      this.mouvementForm.patchValue({
        date: new Date(),
        bien: '',
        libelle: '',
        montant: 0,
        tiers: '',
        commentaires: null
      });
    }
  }

  public isMouvementForLoyer(): number {

    //An eeventual active bail to compare
    let bailForMouvement: Bail | null = null;

    //Try to get active bail for the bien
    if(this.bien && this.bien.value){
      //Loop for all possible bails and select the accurate one
      for (var _i = 0; _i < this.documentService.document.bails.length; _i++) {
        // Find the requested bien
        if(this.documentService.document.bails[_i].bien.id == this.bien.value){
          //If a date exists for the current mouvement
          if(this.date && this.date.value){
            //If the bail has an end date then check if the mouvement date is between begin and end date
            if(this.documentService.document.bails[_i].dateFin){
              if(this.date.value > this.documentService.document.bails[_i].dateDebut && 
                this.date.value < this.documentService.document.bails[_i].dateFin)
              {
                bailForMouvement = this.documentService.document.bails[_i];
              }
            } else{
              if(this.date.value > this.documentService.document.bails[_i].dateDebut)
              {
                bailForMouvement = this.documentService.document.bails[_i];
              }
            }
          }
        }
      }
    }
    if(bailForMouvement && this.montant && parseFloat(this.montant.value) > 0 && this.libelle && this.libelle.value.indexOf("Loyer") != -1){
      if((bailForMouvement.loyer + bailForMouvement.charges) == parseFloat(this.montant.value)){
        return 0;
      }else{
        return bailForMouvement.loyer + bailForMouvement.charges;
      }
    }else{
      return -1;
    }
  }

  public isMouvementForCharge(): boolean {

    let mouvementIsCharge: boolean = false;

    //If a montant is provided and if it is negative
    if(this.montant && parseFloat(this.montant.value) < 0){
      mouvementIsCharge = true;
    }

    return mouvementIsCharge;
  }

  public getBienOfMouvement(): Bien|null {
    if(this.bien){
      for (var _i = 0; _i < this.documentService.document.biens.length; _i++) {
        if(this.documentService.document.biens[_i].id == this.bien.value){
          return this.documentService.document.biens[_i];
        }
      }
    }
    return null;
  }

  public isMouvementForImmeuble(): boolean {

    let bienIsImmeuble: boolean = false;
    let bienOfMouvement: Bien|null = this.getBienOfMouvement();

    if(bienOfMouvement){
      bienIsImmeuble = bienOfMouvement.isImmeuble();
    }

    return bienIsImmeuble;
  }

}
