import {Injectable} from "@angular/core";
import { Observable, Subject } from 'rxjs';

import { User } from '../_modeles/user';

declare const gapi: any;

@Injectable()
export class UserService {

    // The current gapi user connected
    public currentUser: User;
    public authResponse: any;
    // The user is completly signed in (sync and async variables)
    public isSignIn: boolean;
    public isSignInChange: Subject<boolean> = new Subject<boolean>();
    // The signin process is ongoing
    public isLoading: boolean;
    //Various connections dates
    public dateConnection: Date = new Date();
    public dateExpiration: Date = new Date();

    constructor() {
        //Init various variables
        this.currentUser = new User();
        this.isSignIn = false;
        this.isSignInChange.subscribe((value: boolean) => {
            this.isSignIn = value
        });
        this.isSignInChange.next(false);
        this.isLoading = true;

        //Load the google api for future OAUTH load
        gapi.load('client:auth2', () => {this.googleInitClient(); });
    }

    private googleInitClient() {
        gapi.client.init({
            clientId: '474764062918-h31g2d341hajtdhipuggq6uagnfi10rl.apps.googleusercontent.com',
            discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
            //cookiepolicy: 'single_host_origin',
            scope: "https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/gmail.send",
            access_type: 'offline'
        }).then( (res: any) => {
            console.log("UserService:googleInitClient");
            //Get current profile to have some usefull information of the connected user
            var profile = gapi.auth2.getAuthInstance().currentUser.get().getBasicProfile();
            if(profile){
                this.currentUser.nom = profile.getName();
                this.currentUser.mail = profile.getEmail();
                this.currentUser.image = profile.getImageUrl();
            }
            // Listen for sign-in state changes.
            gapi.auth2.getAuthInstance().isSignedIn.listen( (res: boolean) => {this.updateSigninStatus(res)} );
            //Memorize authorisation response for potential futur user (bear token for instance)
            this.authResponse = gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse();
            //Get various dates for user information
            if(this.authResponse.first_issued_at){
                this.dateConnection = new Date(this.authResponse.first_issued_at);
                this.dateExpiration = new Date(this.authResponse.expires_at);
                //Prepare to refresh the token (10s beforeexpiration)
                setTimeout(()=>this.refreshToken(),(this.authResponse.expires_in-10)*1000);
            }
            // Handle the initial sign-in state.
            this.updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());

            // Loading is finished
            this.isLoading = false;
        }, (error: any) => {
            console.dir("Impossible to init the google authentification.")
            console.error(error);
        });
    }

    public updateSigninStatus(isSignedIn: boolean) {
        console.log("UserService:updateSigninStatus :" + isSignedIn);
        //Inform everybody that signin has changed
        this.isSignInChange.next(isSignedIn);
        //Update all authentification and connection dates information
        this.authResponse = gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse();
        if(this.authResponse.first_issued_at){
            this.dateConnection = new Date(this.authResponse.first_issued_at);
            this.dateExpiration = new Date(this.authResponse.expires_at);
            //Prepare to refresh the token (10s beforeexpiration)
            setTimeout(()=>this.refreshToken(),(this.authResponse.expires_in-10)*1000);
        }
    }

    public refreshToken(){
        console.dir("UserService:updateSigninStatus:Token will expire soon...");
        gapi.auth2.getAuthInstance().currentUser.get().reloadAuthResponse().then( (res: any) => {
            this.authResponse = res;
            if(this.authResponse.first_issued_at){
                this.dateConnection = new Date(this.authResponse.first_issued_at);
                this.dateExpiration = new Date(this.authResponse.expires_at);
                //Prepare to refresh the token (10s beforeexpiration)
                console.dir("UserService:updateSigninStatus:Relaunch expiration refresh...");
                setTimeout(()=>this.refreshToken(),(this.authResponse.expires_in-10)*1000);
            }
        });
    }

    public signIn() {
        gapi.auth2.getAuthInstance().signIn();
    }

    public signOut() {
        gapi.auth2.getAuthInstance().signOut();
    }

    public isUserSignedIn(): boolean {
        return this.isSignIn;
    }

    public getCurrentUser(){
        return this.currentUser
    }
}