import { Component, OnInit, Input } from '@angular/core';

import { MatBottomSheet} from '@angular/material/bottom-sheet';

import { DocumentService } from '../_services/document.service';
import { EventService } from '../_services/event.service';
import { Piece, PIECECODE } from '../_modeles/piece';
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
  public missedPieces: string[] = [];
  //Pieces complémentaires à afficher en parallèle des pièces du container
  //Utiles pour les biens associés à des immeubles
  public piecesComplementaires: Piece[] = [];

  constructor(
    public documentService: DocumentService,
    public eventService: EventService,
    private _bottomSheet: MatBottomSheet) { }

  ngOnInit(): void {
    this.getData();

    //If document is reloaded then get data again
    this.documentService.docIsLoadedChange.subscribe((isLoaded: boolean) => {
      if(isLoaded){
        this.getData();
      }
    });
  }

  public getData(){
    
    //Get missed pieces for changing color of the badge
    this.missedPieces = this.eventService.checkPiecesObligatoires(this.container);
    
    this.piecesComplementaires = [];
    //Si le container est un Bien alors un traitement supplémentaire est à prévoir
    if(this.container.className=='Bien'){
      //ON recupère l'immeuble du bien
      let bienImmeuble = this.documentService.getImmeuble(this.container);
      //Si le bien a un immeuble des pièces sont peut être dans l'immeuble (ex : acte de vente ou règlement de Copropriété, ...)
      if(bienImmeuble){
        this.piecesComplementaires = this.piecesComplementaires.concat(bienImmeuble.pieces);
      }
    }
    
  }

  openPieces(): void {
    //Open the list of pieces in a bottom sheet
    const bottomSheetRef = this._bottomSheet.open(PiecesJointesComponent, {
      data: {
        piecesContainer: this.container,
        piecesComplementaires: this. piecesComplementaires,
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