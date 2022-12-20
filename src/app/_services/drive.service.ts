import { Injectable} from '@angular/core';
import { Subject } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { UserService } from './user.service';

declare const gapi: any;

@Injectable({
  providedIn: 'root'
})
export class DriveService {

    // Various mime types to controle file types in the drive
    private folderMimeType: string = "application/vnd.google-apps.folder";
    private filesMimeType: string = "application/json";
    private uploadBoundary = "foo_bar_baz";
    // Expected files and folder in the drive (values not configurable as configuration need the drive)
    private easylocFolderId: string;
    private easylocFolderName: string = "easyloc";
    public dataFileId: string;
    public dataFileVersion: number = 0;
    public dataFileName: string = "data.json";
    public documentsFolderId: string;
    private documentsFolderName: string = "documents";
    public backupFolderId: string;
    private backupFolderName: string = "backup";
    // The drive is fully compliant (sync and async variables)
    public driveIsCompliant: boolean;
    driveIsCompliantChange: Subject<boolean> = new Subject<boolean>();
    // The compliancy process is ongoing
    public isLoading: boolean;

    constructor(
        public userService: UserService,
        public http: HttpClient
    ) {
        // Various init
        this.easylocFolderId = "";
        this.dataFileId = "";
        this.dataFileVersion = 0;
        this.documentsFolderId = "";
        this.backupFolderId = "";
        this.driveIsCompliant = false;
        this.driveIsCompliantChange.subscribe((value: boolean) => {
            this.driveIsCompliant = value
        });
        this.driveIsCompliantChange.next(false);

        //By default not loading
        this.isLoading = false;

        // Subscribe to user signin end of prcess so that drive loading process can begin
        this.userService.isSignInChange.subscribe((isLoggedIn: boolean) => {
            // If user is logged in then the drive can be loaded
            if(isLoggedIn){
                this.initDriveFiles();
            }else{
                this.closeDriveFiles();
            }
        });
    }

    private initDriveFiles() {

        // Standard reinit actions before beginning the init process
        this.easylocFolderId = "";
        this.dataFileId = "";
        this.documentsFolderId = "";
        this.backupFolderId = "";
        this.driveIsCompliant = false;
        this.isLoading = true;

        //We can only fetch files if the user is connected otherwise nothing will be returned
        if(this.userService.isSignIn){

            //First get the easyloc folder
            gapi.client.drive.files.list({
            'q': "name = '"+this.easylocFolderName+"'",
            'fields': "nextPageToken, files(id, name, mimeType)"
            }).then( (response: any) => {
            var files = response.result.files;
            // A unique item has been found which is correct
            if (files && files.length == 1) {
                var file = files[0];
                // This is a folder as expected
                if(file.mimeType == this.folderMimeType){
                // Memorize easyloc folder ID to use it after
                var easylocFolderId = file.id;
                // Get all items (files and folders) of the easy loc folder
                gapi.client.drive.files.list({
                    'q': "'"+easylocFolderId+"' in parents",
                    'fields': "nextPageToken, files(id, name, mimeType, version)"
                }).then( (response: any) => {
                    var files = response.result.files;
                    // Easyloc fodler is not empty : good point !
                    if (files && files.length > 0) {
                        // Loop each file to found the expected ones
                        files.forEach((file: any) => {
                            // Get data file with correct mime type 
                            if(file.name == this.dataFileName && file.mimeType == this.filesMimeType){
                                this.dataFileId = file.id;
                                this.dataFileVersion = file.version;
                            }
                            // Get document folder with correct mime type 
                            if(file.name == this.documentsFolderName &&  file.mimeType == this.folderMimeType){
                                this.documentsFolderId = file.id;
                            }
                            // Get backup folder with correct mime type 
                            if(file.name == this.backupFolderName &&  file.mimeType == this.folderMimeType){
                                this.backupFolderId = file.id;
                            }
                        });

                        // Get all expected documents this it means that configuration is compliant
                        if(this.dataFileId != "" && this.backupFolderId != "" && this.documentsFolderId != ""){
                            console.log("DriveService:initDriveFiles : compliant");
                            this.driveIsCompliantChange.next(true);
                            //Process has ended
                            this.isLoading = false;
                            //Call backup in some time
                            setTimeout(()=>this.backupDataFile(),1000);
                        }else{
                            console.error("'easyloc' folder is not correctly filled.");
                            this.isLoading = false;
                        }
                    }else{
                        console.error("'easyloc' folder is empty.");
                        this.isLoading = false;
                    }
                });
                }else{
                    console.error("'easyloc' exists but this not a folder.");
                    this.isLoading = false;
                }
            } else {
                console.error("'easyloc' folder does not exists.");
                this.isLoading = false;
            }
            });
        }else{
            this.isLoading = false;
        }
    }

    public backupDataFile(){

        //Compute current date to compute backup file name
        const currentDate = new Date();
        const currentDateName = currentDate.getFullYear() + "-" + (currentDate.getMonth()+1<10?'0':'') + (currentDate.getMonth()+1) + "-" + (currentDate.getDate()<10?'0':'') + currentDate.getDate();
        const dateFile = this.dataFileName.split(".");
        const backupFileName = dateFile[0] + "_" + currentDateName + "." + dateFile[1];

        //A backup was found for today
        var backupFound = false;

        //If data file and backup folder are both existant
        if(this.driveIsCompliant){
            // Get all items (files and folders) of the backup folder
            gapi.client.drive.files.list({
                'q': "'"+this.backupFolderId+"' in parents",
                'fields': "nextPageToken, files(id, name, mimeType, version)"
            }).then( (response: any) => {
                var files = response.result.files;
                // Loop each file to found the expected ones
                files.forEach((file: any) => {
                    // Get data file with correct mime type 
                    if(file.name == backupFileName) {
                        backupFound = true;
                    }
                });
                //If a backup already exists do not do it anymore
                if(backupFound){
                    console.dir("A backup file exists for today...");
                }else{
                    //If the backup file doesn't exist just make a copy in the backup folder with the backup name
                    gapi.client.drive.files.copy({
                        'fileId': this.dataFileId,
                        'name':backupFileName,
                        'parents': [this.backupFolderId],
                        'description': "Backup of "+this.dataFileName+" realised the "+currentDateName
                    }).then( (response: any) => {
                        console.dir("Data file is backup for today.");
                    },
                    (error:any) => {
                        console.error("Impossible to make a backup of the data file.");
                        console.dir(error);
                    });
                }
            });
        }
    }

    public get(fileId: string, fields: string = '*'){
    
        //Call the API to get the file corresponding to id
        return gapi.client.drive.files.get({
            'fileId': fileId,
            'fields':'*'
        });
    }

    public download(fileId: string){
        //Call the API to download the file corresponding to id
        return gapi.client.drive.files.get({
            'fileId': fileId,
            'alt': "media"
        });      
    }

    public upload(fileId: string, fileName: string, fileContent:string) {

        //Create the metadata - only limited to filename
        const metadata = {
          name: fileName
        };
        //Create the content which is a mix of metatdata and file content
        let data = "--" + this.uploadBoundary + "\r\n";
        data += "Content-Type: application/json; charset=UTF-8\r\n\r\n";
        data += JSON.stringify(metadata) + "\r\n";
        data += "--" + this.uploadBoundary + "\r\n";
        data += "Content-Type: application/json\r\n\r\n";
        data += fileContent;
        data += "\r\n--" + this.uploadBoundary + "\r\n";
        
        //URl to patch the file contains the file ID
        const url = 'https://www.googleapis.com/upload/drive/v3/files/'+fileId+'?uploadType=multipart';
        
        //Header for the complete request
        let headers = new HttpHeaders()
          .set("Authorization", 'Bearer ' + this.userService.gis_token)
          .set("Content-Type", 'multipart/related; boundary='+this.uploadBoundary);
        
        //Call the method to update the file
        return this.http.patch(`${url}`,data, {headers})
    }

    public addFileInDocumentFolder(file: File){

        // Build metadata information including destination folder
        const metadata = JSON.stringify({
            mimeType: file.type,
            name: file.name,
            parents: [this.documentsFolderId]
        });
        
        // Put metadata and file inside a form data to send it in the right way
        const requestData = new FormData();
        requestData.append("metadata", new Blob([metadata], {
        type: "application/json"
        }));
        requestData.append("file", file);

        //Create headers and add the authorisation token
        let headers = new HttpHeaders()
            .set("Authorization", 'Bearer ' + this.userService.gis_token);
        // URL for dta upload
        const url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

        return this.http.post(`${url}`,requestData, {headers});
    }

    public deleteFileInDocumentFolder(fileId: string){
        
        //Create headers and add the authorisation token
        let headers = new HttpHeaders()
            .set("Authorization", 'Bearer ' + this.userService.gis_token);

        //URl to delete the file contains the file ID
        const url = 'https://www.googleapis.com/drive/v3/files/'+fileId;

        return this.http.delete(`${url}`, {headers});
    }

    public isDriveCompliant(): boolean {
        return this.driveIsCompliant;
    }

    public closeDriveFiles() {
        console.log("DriveService:closeDriveFiles");
        // Reinit all variable to reload drive files if required
        this.easylocFolderId = "";
        this.dataFileId = "";
        this.dataFileVersion = 0;
        this.documentsFolderId = "";
        // Need to relad everything
        this.driveIsCompliantChange.next(false);
    }
}
