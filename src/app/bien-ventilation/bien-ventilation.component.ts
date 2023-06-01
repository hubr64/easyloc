import { Component, Inject, OnInit, Input } from '@angular/core';

import { MatBottomSheet, MAT_BOTTOM_SHEET_DATA} from '@angular/material/bottom-sheet';

import { DocumentService } from '../_services/document.service';
import { Bien } from '../_modeles/bien';
import { Mouvement } from '../_modeles/mouvement';

@Component({
  selector: 'app-bien-ventilation-bottom-sheet',
  templateUrl: './bien-ventilation-bottom-sheet.component.html',
  styleUrls: ['./bien-ventilation-bottom-sheet.component.scss']
})
export class BienVentilationBottomSheetComponent {
  
  public montantToVentilate: number = 0;

  constructor(
    @Inject(MAT_BOTTOM_SHEET_DATA) public data: any,
    public documentService: DocumentService) {
      if(data.mouvement){
        this.montantToVentilate = data.mouvement.montant;
      }else{
        this.montantToVentilate = data.montant;
      }
    }
}

@Component({
  selector: 'app-bien-ventilation',
  templateUrl: './bien-ventilation.component.html',
  styleUrls: ['./bien-ventilation.component.scss']
})
export class BienVentilationComponent implements OnInit {

  // Component input and output
  @Input() immeuble: Bien;
  @Input() mouvement: Mouvement;
  @Input() montant: number;
  @Input() type: string;

  constructor(
    public documentService: DocumentService,
    private _bottomSheet: MatBottomSheet) { }

  ngOnInit(): void {
  }

  openVentilation(): void {
    //Open the list of pieces in a bottom sheet
    this._bottomSheet.open(BienVentilationBottomSheetComponent, {
      data: {
        immeuble: this.immeuble,
        mouvement: this.mouvement,
        montant: this.montant
      },
    });
  }

}
