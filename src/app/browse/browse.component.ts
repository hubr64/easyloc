import { Component, OnInit } from '@angular/core';

import { MatDialog} from '@angular/material/dialog';

import { AlertService } from '../_services/alert.service';
import { UserService } from '../_services/user.service';
import { DocumentService } from '../_services/document.service';
import { ConfigurationService } from '../_services/configuration.service';
import { Bien, BIENTYPE} from '../_modeles/bien';
import { Bail } from '../_modeles/bail';
import { Locataire } from '../_modeles/locataire';
import { MailComponent } from '../mail/mail.component';

@Component({
  selector: 'app-browse',
  templateUrl: './browse.component.html',
  styleUrls: ['./browse.component.scss']
})
export class BrowseComponent implements OnInit {

  public colors: string[] = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc'];
  public visibility : boolean[] = [];
  public bienType = BIENTYPE;
  public displayOrder: string = "nom";

  constructor(
    public alertService: AlertService,
    public userService: UserService,
    public documentService: DocumentService,
    public configurationService: ConfigurationService,
    public dialog: MatDialog) { }

  ngOnInit(): void {
    this.displayOrder = this.configurationService.getValue('ordreBien');
  }

  public getBail(bien: Bien): Bail | null{

    var returnedBail = null;
    this.documentService.document.bails.forEach((bail: Bail) => {
      if (bail.bien == bien && !bail.dateFin){
        returnedBail = bail;
      }
    });
    return returnedBail;
  }

  public toggle(index: number){
    if(this.visibility){
      if(this.visibility[index]){
        this.visibility[index] = false;
      }else{
        this.visibility[index] = true;
      }
    }else{
      this.visibility = [];
      this.visibility[index] = false;
    }
  }

  public contact(locataire:Locataire, event: any){
    event.preventDefault();
    event.stopPropagation();
    //Display the mail dialog
    const dialogRef = this.dialog.open(MailComponent, {
      data: {
        destinataires: locataire.mail,
        emetteur: this.userService.currentUser.mail,
        sujet: "",
        contenu: "\r\n\r\nCordialement.\r\n"+this.userService.currentUser.nom
      },
    });
  }

}
