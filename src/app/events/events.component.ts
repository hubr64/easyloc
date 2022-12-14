import { Component, OnInit, Input } from '@angular/core';
import { Router } from '@angular/router';

import { MatDialog} from '@angular/material/dialog';

import { DocumentService } from '../_services/document.service';
import { EventService } from '../_services/event.service';
import { MailComponent } from '../mail/mail.component';

import { Mouvement } from '../_modeles/mouvement';
import { Event } from '../_modeles/event';

@Component({
  selector: 'app-events',
  templateUrl: './events.component.html',
  styleUrls: ['./events.component.scss']
})
export class EventsComponent implements OnInit{

  // Component input and output
  @Input() container: any;
  @Input() gravite: number;

  events: Event[] = [];
  public eventGravite: number = 2;

  constructor(
    public documentService: DocumentService,
    public eventService: EventService,
    private router: Router,
    public dialog: MatDialog) {
  }

  ngOnInit(): void {
    if(this.gravite != undefined){
      this.eventGravite = this.gravite;
    }
    this.loadEvents();
  }

  public loadEvents(){

    this.events = [];

    let bailEvents = this.eventService.getBailEvents(this.container,this.eventGravite);
    this.events = this.events.concat(bailEvents);

    let bienEvents = this.eventService.getBienEvents(this.container,this.eventGravite);
    this.events = this.events.concat(bienEvents);

    let locataireEvents = this.eventService.getLocataireEvents(this.container,this.eventGravite);
    this.events = this.events.concat(locataireEvents);
    
    let bailleurEvents = this.eventService.getBailleurEvents(this.container,this.eventGravite);
    this.events = this.events.concat(bailleurEvents);

    let mouvementEvents = this.eventService.getMouvementEvents(this.container,this.eventGravite);
    this.events = this.events.concat(mouvementEvents);

    this.events.sort(this.compare);
  }

  private compare(a: Event, b: Event) {
    if ( a.gravite > b.gravite ){
      return -1;
    }
    if ( a.gravite < b.gravite ){
      return 1;
    }
    return 0;
  }
  

  public callEventAction(action: string, event: Event){
    
    switch(action) { 
      case "acquitter": { 
        this.acquitter(event);
        break; 
      } 
      case "relancer": { 
        this.relancer(event);
        break; 
      } 
      default: { 
        console.error('Aucune fonction d??finie pour cette action.');
        break; 
      } 
    } 
  }

  public acquitter(event: Event){
    //First step is to create a mouvment
    let tmpMouvement: Mouvement = new Mouvement();
    tmpMouvement.id = this.documentService.getUniqueId(4);
    tmpMouvement.date = new Date();
    tmpMouvement.bien = event.object.bien;
    tmpMouvement.libelle = "Loyer de " + event.object.toString();
    tmpMouvement.montant = event.object.loyer + event.object.charges;
    tmpMouvement.tiers = event.object.locataire.toString();
    tmpMouvement.commentaires = 'Cr??ation depuis le dashboard';
    //Then add the mouvement in the document
    this.documentService.document.mouvements.push(tmpMouvement);
    //Then go to the quittance generation
    setTimeout(()=>{
      this.router.navigate(['/quittance',  tmpMouvement.id])
    },1000);
  }

  public relancer(event: Event){
    //Get current date
    const currentDate = new Date();
    const options = { year: 'numeric', month: 'long', day: '2-digit' } as const;
    //Retrieve month date in the event
    let monthDate = event.designation.slice(14,-1);

    //Display the mail dialog
    this.dialog.open(MailComponent, {
      data: {
        destinataires: event.object.locataire.mail+";"+event.object.bien.proprietaire.mail,
        emetteur: event.object.bien.proprietaire.mail,
        sujet: "Relance loyer impay?? ("+monthDate+")",
        contenu: "Bonjour,\r\n\r\nA ce jour ("+
          currentDate.toLocaleDateString('fr-FR',options)+
          ") et sauf erreur de ma part, je vous rappelle que nous n'avons toujours pas r??ceptionn?? votre paiement pour le loyer du mois de "+
          monthDate+
          " s?????levant ?? "+
          (event.object.loyer + event.object.charges)+
          "??? (charges incluses).\r\n\r\nEn effet, conform??ment au contrat de location sign?? le "+
          event.object.dateDebut.toLocaleDateString('fr-FR',options)+
          ", l'??ch??ance pour le paiement de votre loyer est fix??e au "+
          event.object.paiementDate.getDate()+
          " de chaque mois.\r\n\r\nAussi, je vous remercie de proc??der au plus vite au r??glement de cette ??ch??ance afin de r??gulariser votre situation.\r\n\r\n"+
          "Dans cette attente, je vous prie d???agr??er, l???expression de mes sentiments distingu??s.\r\n"+event.object.bien.proprietaire.nom
      },
    });

  }

  public noEvent(): boolean {
    return this.events.length == 0;
  }

  public updateEvents(gravite: number){
    this.eventGravite = gravite;
    this.loadEvents();
  }

}
