import { Component, Inject } from '@angular/core';
import { MatDialog, MAT_DIALOG_DATA} from '@angular/material/dialog';

@Component({
  selector: 'dialog-delete-confirm',
  templateUrl: './dialog-delete-confirm.component.html',
})
export class DialogDeleteConfirmComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {}
}