import { Component, OnInit, Input } from '@angular/core';

import { MatBottomSheet} from '@angular/material/bottom-sheet';

import { DocumentService } from '../_services/document.service';
import { EventService } from '../_services/event.service';
import { PIECECODE } from '../_modeles/piece';
import { PiecesJointesComponent } from '../pieces-jointes/pieces-jointes.component';

@Component({
  selector: 'app-pieces-jointes-liste',
  templateUrl: './pieces-jointes-liste.component.html',
  styleUrls: ['./pieces-jointes-liste.component.scss']
})
export class PiecesJointesListeComponent implements OnInit {

  // Component input and output
  @Input() container: any;
  @Input() badgeColor: any;
  //Convert piece code to string
  public pieceCode = PIECECODE;
  //Missed pieces beyond mandatary expected pieces
  public missedPieces: string[];

  constructor(
    public documentService: DocumentService,
    public eventService: EventService,
    private _bottomSheet: MatBottomSheet) { }

  ngOnInit(): void {
    //Get missed pieces for changing color of the badge
    this.missedPieces = this.eventService.checkPiecesObligatoires(this.container)
  }

  openPieces(): void {
    //Open the list of pieces in a bottom sheet
    const bottomSheetRef = this._bottomSheet.open(PiecesJointesComponent, {
      data: {
        piecesContainer: this.container,
        canAdd: true,
        canRemove: true
      },
    });

    bottomSheetRef.afterDismissed().subscribe(() => {
      //Compute missing pieces once again
      this.missedPieces = this.eventService.checkPiecesObligatoires(this.container)
    });

  }

}