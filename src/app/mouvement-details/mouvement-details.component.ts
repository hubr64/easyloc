import { Component, OnInit, Inject } from '@angular/core';
import { MAT_DIALOG_DATA} from '@angular/material/dialog';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { Observable} from 'rxjs';
import { map, startWith} from 'rxjs/operators';

import { DocumentService } from '../_services/document.service';
import { ConfigurationService } from '../_services/configuration.service';
import { Bail } from '../_modeles/bail';

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

  public checkForm(){
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
          //If the bail has an end date (bail finish) and if a bail is already selected
          if(this.documentService.document.bails[_i].dateFin && bailForMouvement){
            //If the bail is later then the already selected
            if(this.documentService.document.bails[_i].dateFin > bailForMouvement.dateFin){
              bailForMouvement = this.documentService.document.bails[_i];
            }
          //No bail is selected or bail has no end date (current bail on the bien)  
          }else{
            bailForMouvement = this.documentService.document.bails[_i];
            break;
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

}
