import { Component, Input, OnInit, Inject } from '@angular/core';

import { MAT_BOTTOM_SHEET_DATA, MatBottomSheet, MatBottomSheetRef} from '@angular/material/bottom-sheet';

import { EventService } from '../_services/event.service';
import { EventsComponent } from '../events/events.component';
import { Event } from '../_modeles/event';

@Component({
  selector: 'app-events-liste',
  templateUrl: './events-liste.component.html',
  styleUrls: ['./events-liste.component.scss']
})
export class EventsListeComponent implements OnInit {

  // Component input and output
  @Input() container: any;

  public events: Event[] = [];
  public badgeColor: any = "primary";

  constructor(
    public eventService: EventService,
    private _bottomSheet: MatBottomSheet) { }

  ngOnInit(): void {
    this.eventService.eventsAreLoadedChange.subscribe((isLoaded: boolean) => {
      if(isLoaded){
        this.loadEvents();
      }
    });
    if(this.eventService.eventsAreLoaded){
      this.loadEvents();
    }
  }

  private loadEvents(){
    //Get all events for the requested container
    this.events = this.eventService.getEvents(this.container);
    //Compute color of badge according to global gravite
    this.events.forEach((event:Event) => {
      //If at least one is very grave then display in warn
      if(event.gravite>1 && (this.badgeColor=='primary'||this.badgeColor=='accent')){
        this.badgeColor = "warn";
      }
      if(event.gravite>0 && this.badgeColor=='primary'){
        this.badgeColor = "accent";
      }
    });
  }

  public openEvents(): void {
    //Open the list of events in a bottom sheet
    this._bottomSheet.open(EventsListeComponentSheet, {
      data: {
        container: this.container
      },
    });
  }

}

@Component({
  selector: 'app-events-liste-sheet',
  templateUrl: './events-liste-sheet.component.html',
})
export class EventsListeComponentSheet {
  constructor(
    @Inject(MAT_BOTTOM_SHEET_DATA) public data: any,
    private _bottomSheetRef: MatBottomSheetRef<EventsListeComponentSheet>) {}

}
