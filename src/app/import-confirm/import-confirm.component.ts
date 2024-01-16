import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA} from '@angular/material/dialog';
import { TYPEICON } from '../_modeles/easyloc.data';

@Component({
  selector: 'app-import-confirm',
  templateUrl: './import-confirm.component.html',
  styleUrls: ['./import-confirm.component.scss']
})
export class ImportConfirmComponent {

  public userTypeIcon = TYPEICON;

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {}
}
