import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA} from '@angular/material/dialog';

import { Bien } from '../_modeles/bien';
import { Mouvement } from '../_modeles/mouvement';

@Component({
  selector: 'app-mouvement-pick-dialog',
  templateUrl: './mouvement-pick-dialog.component.html',
  styleUrls: ['./mouvement-pick-dialog.component.scss']
})
export class MouvementPickDialogComponent {

  public defaultBien: Bien;
  public mouvements: Mouvement[] = [];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.defaultBien = this.data.defaultBien;
  }

  onSelected(mouvements: Mouvement[]){
    this.mouvements = mouvements;
  }


}
