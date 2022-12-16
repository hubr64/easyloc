import { Component, OnInit, Input } from '@angular/core';

import { EventService } from '../_services/event.service';

@Component({
  selector: 'app-events-fiche',
  templateUrl: './events-fiche.component.html',
  styleUrls: ['./events-fiche.component.scss']
})
export class EventsFicheComponent implements OnInit {

  // Component input and output
  @Input() container: any;
  @Input() gravite: number;

  constructor(
    public eventService: EventService
  ) { }

  ngOnInit(): void {
  }


}


