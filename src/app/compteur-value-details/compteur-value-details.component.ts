import { Component, OnInit, Inject } from '@angular/core';
import { MatDialog, MAT_DIALOG_DATA} from '@angular/material/dialog';
import { FormGroup, FormControl, Validators } from '@angular/forms';

import { DocumentService } from '../_services/document.service';
import { Piece } from '../_modeles/piece';
import { PiecesChoixComponent } from '../pieces-choix/pieces-choix.component';

@Component({
  selector: 'app-compteur-value-details',
  templateUrl: './compteur-value-details.component.html',
  styleUrls: ['./compteur-value-details.component.scss']
})
export class CompteurValueDetailsComponent implements OnInit{

  //Global form
  public compteurValueForm: FormGroup;
  //Selected preuve
  public selectedPreuve: Piece|null = null;
  //Display compteur selection
  public chooseCompteur: boolean = false;

  constructor(
    public documentService: DocumentService,
    public dialog: MatDialog,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) { }

  ngOnInit(): void {
    if(this.data.chooseCompteur){
      this.chooseCompteur = this.data.chooseCompteur;
    }

    this.compteurValueForm = new FormGroup({
      'compteur': (this.chooseCompteur==false?(new FormControl('')):(new FormControl('', [
        Validators.required
      ],))),
      'dateReleve': new FormControl('', [
        Validators.required
      ],),
      'valeur': new FormControl('', [
        Validators.required
      ]),
      'preuve': new FormControl(''),
      'preuveName': new FormControl(''),
      'commentaires': new FormControl('')
    });

    this.getData();
    
    // SUbscribe in case the document was reloaded
    this.documentService.docIsLoadedChange.subscribe((isLoaded: boolean) => {
      if(isLoaded){
        this.getData();
      }
    });
  }

  get compteur() { return this.compteurValueForm.get('compteur'); }
  get dateReleve() { return this.compteurValueForm.get('dateReleve'); }
  get valeur() { return this.compteurValueForm.get('valeur'); }
  get preuve() { return this.compteurValueForm.get('preuve'); }
  get commentaires() { return this.compteurValueForm.get('commentaires'); }

  getData(): void {
    //If an existing one is edited
    if(this.data.compteurValue){
      this.compteurValueForm.patchValue({
        compteur: null,
        dateReleve: this.data.compteurValue.dateReleve,
        valeur: this.data.compteurValue.valeur,
        preuve: this.data.compteurValue.preuve.id,
        preuveName: this.data.compteurValue.preuve.description,
        commentaires: this.data.compteurValue.commentaires
      });
      this.selectedPreuve = this.data.compteurValue.preuve;

    // New one requested
    }else{
      this.compteurValueForm.patchValue({
        compteur: this.data.compteur?this.data.compteur:null,
        dateReleve: new Date(),
        valeur: '000000',
        preuve: null,
        preuveName: null,
        commentaires: null
      });

      this.selectedPreuve = null;
    }
  }

  public choosePreuve(){
    //Display a dialog to add a piece
    const dialogRef = this.dialog.open(PiecesChoixComponent, {
      data: {
        multiple: false
      }
    });

    dialogRef.afterClosed().subscribe((result:any) => {
      //If user has choosed a file
      if(result){
        // If one
        if(result.length == 1){
          this.selectedPreuve = result[0];
          if(this.selectedPreuve){
            this.compteurValueForm.patchValue({
              preuve: this.selectedPreuve.id,
              preuveName: this.selectedPreuve.description
            });
          }
        }
      }
    });

  }

}
