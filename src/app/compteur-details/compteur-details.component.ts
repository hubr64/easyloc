import { Component, OnInit, Inject } from '@angular/core';
import { MAT_DIALOG_DATA} from '@angular/material/dialog';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { Observable} from 'rxjs';
import { map, startWith} from 'rxjs/operators';

import { DocumentService } from '../_services/document.service';
import { ConfigurationService } from '../_services/configuration.service';

@Component({
  selector: 'app-compteur-details',
  templateUrl: './compteur-details.component.html',
  styleUrls: ['./compteur-details.component.scss']
})
export class CompteurDetailsComponent implements OnInit{

  //Global form
  public compteurForm: FormGroup;
  //Default proposed libelles
  public designationsAuto: string[];
  public designationsAutoFiltered: Observable<string[]>;

  constructor(
    public documentService: DocumentService,
    public configurationService: ConfigurationService,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) { 
    //Get list of designation for compteurs
    this.designationsAuto = this.configurationService.getValue('compteurAutoComplete').split(";");
    //Sort list alphabetically
    this.designationsAuto = this.designationsAuto.sort();
  }

  ngOnInit(): void {
    this.compteurForm = new FormGroup({
      'bien': new FormControl('', [
        Validators.required
      ]),
      'id': new FormControl('', [
        Validators.required
      ]),
      'designation': new FormControl('', [
        Validators.required
      ]),
      'commentaires': new FormControl('')
    });

    this.designationsAutoFiltered = this.compteurForm.get('designation')!.valueChanges.pipe(
      startWith(''),
      map((value: any) => this._filter(value)),
    );

    this.getData();
    
    // SUbscribe in case the document was reloaded
    this.documentService.docIsLoadedChange.subscribe((isLoaded: boolean) => {
      if(isLoaded){
        this.getData();
      }
    });
  }

  private _filter(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.designationsAuto.filter(designationAuto => designationAuto.toLowerCase().includes(filterValue));
  }

  get bien() { return this.compteurForm.get('bien'); }
  get id() { return this.compteurForm.get('id'); }
  get designation() { return this.compteurForm.get('designation'); }
  get commentaires() { return this.compteurForm.get('commentaires'); }

  getData(): void {
    //If an existing one is edited
    if(this.data.compteur){
      this.compteurForm.patchValue({
        bien: this.data.compteur.bien.id,
        id: this.data.compteur.id,
        designation: this.data.compteur.designation,
        commentaires: this.data.compteur.commentaires
      });

    // New one requested
    }else{
      this.compteurForm.patchValue({
        bien: '',
        id: '',
        designation: '',
        commentaires: null
      });
    }
  }

  public checkForm(){
  }
}
