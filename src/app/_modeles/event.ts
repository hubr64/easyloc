export const EVENTGRAVITE: {[key: number]: string} = {
  0: "Information",
  1: "Attention",
  2: "Alerte"
}

//The event action possible for an event
export class EventAction {
  className: string;
  icone: string;
  title: string;
  routerLink: string|null; //An url to go to throught the routerLink
  action: string|null; //A typescript action to execute (action need to be defined as it is just the funciton name here)

  constructor() {
    this.className = 'EventAction';
    this.icone = '';
    this.title = '';
    this.routerLink = null;
    this.action = null;
  }
}

//An event that occurs on various object on the data definition 
export class Event {
  className: string;
  designation: string;
  gravite: number;
  icone: string;
  object: any|null;
  actions : EventAction[];

  constructor() {
    this.className = 'Event';
    this.designation = '';
    this.gravite = 0;
    this.icone = '';
    this.object = null;
    this.actions = [];
  }

  toString(): string{
    return this.designation;
  }

}