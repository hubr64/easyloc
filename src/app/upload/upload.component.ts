import { Component, OnInit, Inject } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';

import { DriveService } from '../_services/drive.service';
import { AlertService } from '../_services/alert.service';
import { PIECECODE as pieceCodes } from '../_modeles/piece';

@Component({
  selector: 'app-upload',
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.scss']
})
export class UploadComponent implements OnInit {

  //Liste des fichiers qui l'utilisateur souhaite uploader
  files: any[] = [];
  //Conversion between codes and text of codes
  public codes = pieceCodes;

  constructor(
    public driveService: DriveService,
    public alertService: AlertService,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogRef: MatDialogRef<UploadComponent>) { }

  ngOnInit(): void {
    this.dialogRef.disableClose = true;
  }

  public onFileDropped(event: any) {
    this.prepareFilesList(event);
  }

  public fileBrowseHandler(event: any) {
    const files = event.target.files;
    this.prepareFilesList(files);
  }

  public deleteFile(index: number) {
    //Ask to the drive to remove the file
    this.driveService.deleteFileInDocumentFolder(this.files[index].fileId).subscribe(
      (response:any) => {
        //File is correctly removed then remove it from display
        this.files.splice(index, 1);
      },
      (error:any) => {
        //An error occurs the display it
        this.alertService.error("Impossible de supprimer le fichier : " + error);
      });
  }

  private prepareFilesList(files: any[]) {
    // Parcours chaque fichier fourni
    for (const item of files) {
      //Initialisation des états d'affichage
      item.progressMode = "indeterminate";
      item.progressColor = "primary";
      item.code = 'DIVERS';
      //Ajout du fichier dans la liste des fichiers à traiter
      this.files.push(item);
      // On demande l'ajout du fichier dans le drive
      this.driveService.addFileInDocumentFolder(item)
      .subscribe(
        (response:any) => {
          //On change l'état affiché
          item.progressMode = "determinate";
          //On mémorise l'identifiant
          item.fileId = response.id;
          //Manage final message alert
          this.alerteFinale();
        },
        (error:any) => {
          //Le fichier n'est pas bien chargé dans le drive donc on affiche le problème
          item.progressMode = "buffer";
          item.progressColor = "warn";
          //if at least one fails then display an error alert
          this.alerteFinale();
        });
    }
  }

  public retry(index: number) {
    //Initialisation des états d'affichage
    this.files[index].progressMode = "indeterminate";
    this.files[index].progressColor = "primary";
    this.driveService.addFileInDocumentFolder(this.files[index]).subscribe(
      (response:any) => {
        //On change l'état affiché
        this.files[index].progressMode = "determinate";
        //On mémorise l'identifiant
        this.files[index].fileId = response.id;
      },
      (error:any) => {
        //Le fichier n'est pa bien chargé dans le drive donc on affiche le problème
        this.files[index].progressMode = "buffer";
        this.files[index].progressColor = "warn";
      });
  }

  private alerteFinale(){
    var succeed: boolean = true;
    var finish: boolean = true;

    //Parcours de toucs les fichiers
    for (const item of this.files) {
      // Si un fichier est encore à indeterminé alors ce n'est pas fini
      if(item.progressMode == "indeterminate"){
        finish = false;
      }
      // SI un fichier est à warn c'est qu'il a un problème
      if(item.progressColor == "warn"){
        succeed = false;
      }
    }

    // ON n'affiche que si c'est fini (pas avant sinon y a trop de messages)
    if(finish){
      // Si tout est bon on affiche un succès
      if(succeed){
        this.alertService.success("Les fichiers ont bien été chargés !");
      // Si au moins un est mauvais alors on affiche une erreur
      }else{
        this.alertService.error("Au moins un fichier n'a pas été chargé !");
      }
    }
  }

  beforeChoose(){
    //We look in the list to see if there is a failed file that can't be choosen
    for (var _i = 0; _i < this.files.length; _i++) {
      // A file is warn which mean that it hasn't been uploaded
      if (this.files[_i].progressColor == "warn") {
        //Remove it
        console.log("Remove " + this.files[_i].name + " from the list (invalid file)")
        this.files.splice(_i, 1);
      }
    }
  }

  beforeCancel(){
    //We look in the list to see if there are files to remove in the drive
    for (var _i = 0; _i < this.files.length; _i++) {
      // A file is determinte which mean that it has been uploaded and need to be removed
      if (this.files[_i].progressMode == "determinate") {
        //Get file id to remove
        const fileIdToRemove = this.files[_i].fileId;
        console.log("Remove " + this.files[_i].fileId + "("+_i+") from the drive (not used anymore)");
        //Remove it from display
        this.files.splice(_i, 1);
        //Remove it from the drive
        this.driveService.deleteFileInDocumentFolder(fileIdToRemove).subscribe(
          (response:any) => {
            //File is correctly removed then check if anything else to remove
            this.cancelFinal();
          },
          (error:any) => {
            console.error("Impossible to remove unusefful file from drive.")
            console.dir(error);
          });
      }
      // A file is warn which mean that it hasn't been uploaded
      if (this.files[_i].progressColor == "warn") {
        //Remove it
        console.log("Remove " + this.files[_i].name + " from the list (invalid file)")
        this.files.splice(_i, 1);
      }
    }
    // If there is no file (direct cancel) then can cancel directly
    if(this.files.length == 0){
      this.cancelFinal();
    }
  }

  cancelFinal(){
    var finish: boolean = true;
    //Parcours de toucs les fichiers
    for (const item of this.files) {
      // SI un fichier est encore à determiné alors ce n'est pas fini (reste à supprimer)
      if(item.progressMode == "determinate"){
        finish = false;
      }
    }
    // On peut fermer la fenêtre quand tout a été supprimé
    if(finish){
      this.dialogRef.close(false);
    }
  }

  formatBytes(bytes: any, decimals: any) {
    if (bytes === 0) {
      return '0 Bytes';
    }
    const k = 1024;
    const dm = decimals <= 0 ? 0 : decimals || 2;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  public compareCodes(a: any, b: any){
    return (a.value < b.value ? -1 : a.value > b.value ? 1 : 0)
  }

}
