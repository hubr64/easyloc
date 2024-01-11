import { Component, OnInit, Inject } from '@angular/core';
import { MAT_DIALOG_DATA} from '@angular/material/dialog';

@Component({
  selector: 'app-pieces-choix',
  templateUrl: './pieces-choix.component.html',
  styleUrls: ['./pieces-choix.component.scss']
})
export class PiecesChoixComponent implements OnInit {

  public pieces: any[] = [];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any
  ) { }

  ngOnInit(): void {
  }

  onSelected(pieces: any){
    this.pieces = pieces;
  }

}
