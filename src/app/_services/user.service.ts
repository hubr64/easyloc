import { Injectable } from "@angular/core";
import { Subject } from 'rxjs';
import jwt_decode from 'jwt-decode';

import { AlertService } from '../_services/alert.service';
import { User } from '../_modeles/user';

//declare const gapi: any;
declare const google: any;
declare const gapi: any;

@Injectable()
export class UserService {

    //Gis Clients 
    public g_client_id: string = "474764062918-h31g2d341hajtdhipuggq6uagnfi10rl.apps.googleusercontent.com";
    private gis_token_client: any;
    public g_cookie_id: string = "easyloc-cookie-id";
    //Authentification token
    public gis_token: any;
    // The current gapi user connected
    public currentUser: User;
    // The user is completly signed in (sync and async variables)
    public isSignIn: boolean;
    public isSignInChange: Subject<boolean> = new Subject<boolean>();
    // The signin process is ongoing
    public isLoading: boolean;
    //Various connections dates
    public dateConnection: Date = new Date();
    public dateExpiration: Date = new Date();

    constructor(
        public alertService: AlertService
    ) {
        //Init various variables
        this.currentUser = new User();
        this.isSignIn = false;
        this.isSignInChange.subscribe((value: boolean) => {
            this.isSignIn = value
        });
        this.isSignInChange.next(false);
        this.isLoading = true;

        try{
            //Load the google api for future OAUTH load
            gapi.load('client', () => {this.initGapi(); });
        }catch(error:any){
            this.alertService.error("Impossible de se connecter à Google pour charger les fonctions de l'API ! Veuillez réessayer ultérieurement.")
        }

        //Handle the google anthentification callback (at global level) send by the google identification service
        // @ts-ignore
        window.handleCredentialResponse = (response: any) => {
            //Function just call the service function
            this.handleCredentials(response);
        }

        //Check if we have a cookie that store authentification information (prevent new authentification request)
        let cookies: any = document.cookie;
        cookies = cookies.split("; ")
        cookies.forEach((cookie:string) => {
            let cookieDef = cookie.split("=");
            if(cookieDef[0] == this.g_cookie_id){
                console.log("UserService:constructor : A cookie exists, do not request access just refresh token")
                //Store credential
                this.storeCredential(cookieDef[1]);
                //And then refresh credential to ask for a new access
                this.refreshToken();
            }
        });
    }

    //Init the Google API part that cover drive and mail but no more authentification
    private initGapi(){
        //Call gapi initialisation
        gapi.client.init({
        })
        .then(() => {
            //Initialisation is OK then load the drive discovery
            gapi.client.load('https://www.googleapis.com/discovery/v1/apis/drive/v3/rest');
            //Load the Google Identify Service (GIS) for identification
            this.googleInitClient();
            //Now wait 5 seconds for auto authentification and if doesn't work then go to manuel connexion
            setTimeout(()=>{
                if(this.isLoading == true){
                    this.alertService.error("Connexion automatique impossible...")
                    this.isLoading = false;
                }
            },10000);
        });
    }

    //Init the Google GIS part that cover authentification
    private googleInitClient() {

        console.log("UserService:googleInitClient");

        try{
            //Init the Google Token client with client id, drive and mail scope and scope only for the first time
            this.gis_token_client = google.accounts.oauth2.initTokenClient({
                client_id: this.g_client_id,
                scope: 'https://www.googleapis.com/auth/drive \
                        https://www.googleapis.com/auth/gmail.send \
                        https://www.googleapis.com/auth/gmail.readonly \
                        https://www.googleapis.com/auth/gmail.modify',
                prompt: '',
                callback: (tokenResponse: any) => {
                    console.log("UserService:googleInitClient:initTokenClient:callback");
                    //Memorize the token for future use in the Google api  (bear token for instance)
                    this.gis_token = tokenResponse;
                    // Handle the initial sign-in state.
                    this.isSignInChange.next(true);
                    // Loading is finished
                    this.isLoading = false;
                    //Prepare to refresh the token (10s before expiration)
                    this.dateExpiration = new Date();
                    this.dateExpiration.setSeconds(this.dateExpiration.getSeconds() + this.gis_token.expires_in*1000);
                    setTimeout(()=>this.refreshToken(),(this.gis_token.expires_in-10)*1000);   
                },
                error_callback: (error: any) => {
                    console.dir("Impossible to init the google token client.")
                    console.error(error);
                }
            });
        }catch(error:any){
            this.alertService.error("Impossible de se connecter à Google pour charger les fonctions d'authentification ! Veuillez réessayer ultérieurement.")
        }
    }

    //Function to handle credential callback in the service
    private handleCredentials(response:any){
        //A response is send via the GIS callback with credential
        if(response && response.credential){
            //Decode and store the JWT credential to get more information on the user
            this.storeCredential(response.credential);
            //Store credential in a cookie to prevent unusefull authentification request
            document.cookie = this.g_cookie_id + "="+response.credential+"; expires="+ this.dateExpiration.toUTCString();
            //Load the token to gain access to drive and mail now that user is identified
            if(this.gis_token_client){
                console.log("UserService:handleCredentials : Client is loaded then request access token.");
                this.gis_token_client.requestAccessToken({prompt: ''});
            }else{
                console.log("UserService:handleCredentials : Wait 5 more seconds as the client is still not loaded.");
                setTimeout(() => this.handleCredentials(response), 1000);
            }
        }
    }

    public storeCredential(credential: any){
        //Decode the JWT credentiel to get more informaiton on the user
        var decodeCreds: any = jwt_decode(credential);
        //From credential get all usefull information
        this.dateConnection = new Date(decodeCreds.iat*1000);
        this.dateExpiration = new Date(decodeCreds.exp*1000);
        this.currentUser.nom = decodeCreds.family_name + " " + decodeCreds.given_name;
        this.currentUser.mail = decodeCreds.email;
        this.currentUser.image = decodeCreds.picture;
    }

    public refreshToken(){
        //Refresh is just a token request but without prompt (pop up display and hide)
        if(this.gis_token_client){
            console.dir("UserService:refreshToken:Token needs to be refreshed...");
            this.gis_token_client.requestAccessToken({prompt: 'none'});
        }else{
            setTimeout(() => this.refreshToken(), 1000);
        }
    }

    public signOut() {
        //Get token for gapi
        let cred = gapi.client.getToken();
        //A token exists then we can revoke
        if (cred !== null) {
            //Revoke OATUH2 token
            google.accounts.oauth2.revoke(cred.access_token, () => {
                console.log('Token is now revoked: ' + cred.access_token)}
            );
            //Clear gapi token that can be no more used
            gapi.client.setToken('');
            //CLear local service topken 
            this.gis_token = '';
            //Warn everybody that now we are no more logged in
            this.isSignInChange.next(false);
            //Remove cookie 
            document.cookie = this.g_cookie_id+"= ; expires = Thu, 01 Jan 1970 00:00:00 GMT";
        }
    }

    public signIn() {
        //Indicate that we are loading the authentification process
        this.isLoading = true;
        //Load a new token with consent prompt (pop up display a consent agreement)
        this.gis_token_client.requestAccessToken({prompt: 'consent'});
    }

    public isUserSignedIn(): boolean {
        return this.isSignIn;
    }

    public getCurrentUser(){
        return this.currentUser
    }
}