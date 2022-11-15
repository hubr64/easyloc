import { Injectable } from '@angular/core';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { ConfigurationService } from './configuration.service';

@Injectable()
export class AlertService {

    public message: string = "";
    public type: string = "";
    private horizontalPosition: MatSnackBarHorizontalPosition = 'end';
    private verticalPosition: MatSnackBarVerticalPosition = 'bottom';
    private messageDuration: number = 3;

    constructor(
        private _snackBar: MatSnackBar,
        public configurationService: ConfigurationService) {
            this.messageDuration = parseInt(this.configurationService.getValue('messageDuration'));
    }

    success(message: string, keepAfterNavigationChange = false) {

        this.message = message;
        this.type = 'success';
        this._snackBar.open(message, 'OK', {
            horizontalPosition: this.horizontalPosition,
            verticalPosition: this.verticalPosition,
            panelClass: 'success-alert',
            duration: this.messageDuration * 1000
          });
    }

    error(message: string, keepAfterNavigationChange = false) {
        this.message = message;
        this.type = 'error';
        this._snackBar.open(message, 'OK', {
            horizontalPosition: this.horizontalPosition,
            verticalPosition: this.verticalPosition,
            panelClass: 'error-alert',
            duration: this.messageDuration * 1000
          });
    }

}