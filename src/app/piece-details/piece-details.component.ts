import { Component, OnInit, Inject } from '@angular/core';
import { MatDialog, MAT_DIALOG_DATA} from '@angular/material/dialog';
import { FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { Observable} from 'rxjs';
import { map, startWith} from 'rxjs/operators';

import { DocumentService } from '../_services/document.service';
import { ConfigurationService } from '../_services/configuration.service';
import { Piece } from '../_modeles/piece';
import { PIECECODE as pieceCodes } from '../_modeles/piece';

@Component({
  selector: 'app-piece-details',
  templateUrl: './piece-details.component.html',
  styleUrls: ['./piece-details.component.scss']
})
export class PieceDetailsComponent implements OnInit {

  //Global form
  public pieceForm: FormGroup;
  //Conversion between codes and text of codes
  public codes = pieceCodes;

  constructor(
    private formBuilder: FormBuilder,
    public documentService: DocumentService,
    public configurationService: ConfigurationService,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) { }

  ngOnInit(): void {
    this.pieceForm = new FormGroup({
      'id': new FormControl('', [
        Validators.required,
        Validators.pattern('[0-9a-zA-Z-_]{33}')
      ]),
      'nom': new FormControl('', [
        Validators.required
      ]),
      'description': new FormControl('', [
        Validators.required
      ]),
      'code': new FormControl('', [
        Validators.required
      ])
    });

    this.getData();
  }

  get id() { return this.pieceForm.get('id'); }
  get nom() { return this.pieceForm.get('nom'); }
  get description() { return this.pieceForm.get('description'); }
  get code() { return this.pieceForm.get('code'); }

  getData(): void {
    if(this.data.piece){
      this.pieceForm.patchValue({
        id: this.data.piece.id,
        nom: this.data.piece.nom,
        description: this.data.piece.description,
        code: this.data.piece.code
      });
    }
  }

  public compareCodes(a: any, b: any){
    return (a.value < b.value ? -1 : a.value > b.value ? 1 : 0)
  }

}
