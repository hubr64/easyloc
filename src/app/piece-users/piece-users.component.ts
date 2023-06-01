import { Component, Inject } from '@angular/core';
import { MatBottomSheetRef, MAT_BOTTOM_SHEET_DATA} from '@angular/material/bottom-sheet';
import { TYPEICON } from '../_modeles/easyloc.data';

@Component({
  selector: 'app-piece-users',
  templateUrl: './piece-users.component.html',
  styleUrls: ['./piece-users.component.scss']
})
export class PieceUsersComponent {

  public userTypeIcon = TYPEICON;

  constructor(
    @Inject(MAT_BOTTOM_SHEET_DATA) public data: any,
    private _bottomSheetRef: MatBottomSheetRef<PieceUsersComponent>) { 
    }

    detachUser(user:any, event: any){
      //Do not propagate click
      event.preventDefault();
      //Remove the piece only in the container and not in e list of pieces
      const indexPiece = user.pieces.indexOf(this.data.piece, 0);
      if (indexPiece > -1) {
        user.pieces.splice(indexPiece, 1);
      }
      // Remove it in the displayed list
      const indexUser = this.data.users.indexOf(user, 0);
      if (indexUser > -1) {
        this.data.users.splice(indexUser, 1);
      }
    }

    openLink(): void {
      this._bottomSheetRef.dismiss();
      //event.preventDefault();
    }

}
