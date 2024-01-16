import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';

import { AlertService } from '../_services/alert.service';

@Component({
  selector: 'app-import',
  templateUrl: './import.component.html',
  styleUrls: ['./import.component.scss']
})
export class ImportComponent implements OnInit {

  //Liste des fichiers qui l'utilisateur souhaite importer
  files: any[] = [];
  filesContent: any[] =[];

  constructor(
    public alertService: AlertService,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogRef: MatDialogRef<ImportComponent>) { }

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

  private prepareFilesList(files: any[]) {
    // Parcours chaque fichier fourni
    for (const file of files) {
      //FIle is loading at the begining
      file.progress = "loading";
      //Ajout du fichier dans la liste des fichiers à traiter
      this.files.push(file);

      //Type or extension is not compliant
      if(this.data.authorisedTypes.indexOf(file.type) == -1 || this.data.authorisedExtensions.indexOf("."+file.name.split('.').pop()) == -1){
        file.progress = "error";
        this.filesContent.push("?");
      }else{
        //Create a file reader to read contentn of the file as plain text
        const reader = new FileReader(); 
        reader.onload = () => { 
          //Put the content in the array of content
          this.filesContent.push(reader.result as string);
          //FIle has finished to be loaded
          file.progress = "finish";
          //Manage final message alert
          this.alerteFinale();
        };
        reader.onerror = () => { 
          //Impossible to load the file content
          file.progress = "error";
          this.filesContent.push("?");
          //Manage final message alert
          this.alerteFinale();
        }; 
        reader.readAsText(file,this.data.encoding);
      }
    }
  }

  public deleteFile(index: number) {
    //Ask to the drive to remove the file
    this.files.splice(index, 1);
    this.filesContent.splice(index, 1);
  }

  private alerteFinale(){
    var succeed: boolean = true;
    var finish: boolean = true;

    //Parcours de tous les fichiers
    for (const item of this.files) {
      // Si un fichier est encore à indeterminé alors ce n'est pas fini
      if(item.progress == "loading"){
        finish = false;
      }
      // Si un fichier est à warn c'est qu'il a un problème
      if(item.progress == "error"){
        succeed = false;
      }
    }

    // On n'affiche que si c'est fini (pas avant sinon y a trop de messages)
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
      if (this.files[_i].progress == "error") {
        //Remove it
        console.log("Remove " + this.files[_i].name + " from the list (invalid file)")
        this.files.splice(_i, 1);
        this.filesContent.splice(_i, 1);
      }
    }
  }

  canImport(): boolean{
    var canImport:boolean = true;
    for (var _i = 0; _i < this.files.length; _i++) {
      if (this.files[_i].progress != "finish") {
        canImport = false;
      }
    }
    return this.files.length>0 && canImport;
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

}
