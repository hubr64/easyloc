import { Component, Inject, ApplicationRef } from '@angular/core';
import { MatDialog, MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import { DriveService } from '../_services/drive.service';

@Component({
  selector: 'app-dialog-reload',
  templateUrl: './dialog-reload.component.html',
  styleUrls: ['./dialog-reload.component.scss']
})
export class DialogReloadComponent {
  constructor(
    public driveService: DriveService,
    public dialogRef: MatDialogRef<DialogReloadComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    public applicationRef: ApplicationRef
  ) {}

  public continue(result: boolean) {
    this.dialogRef.close(result);
    setTimeout(() => {
      this.applicationRef.tick();
    }, 50);
}
}
