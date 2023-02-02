import { Locataire } from './locataire';
import { Bailleur } from './bailleur';
import { Bien } from './bien';
import { Bail } from './bail';
import { Piece } from './piece';
import { Mouvement } from './mouvement';
import { Compteur } from './compteur';

export const TYPEICON: {[key: string]: string} = {
  "Locataire": 'people',
  "svg.Bailleur": 'bailleur',
  "Bien": 'apartment',
  "Bail": 'assignment',
  "Quittance": 'receipt_long',
  "Mouvement": 'euro_symbol',
  "Compteur": 'pin'
};

export class EasylocData {
  createdBy: string;
  creationDate: Date;
  modifiedBy: string;
  modificationDate: Date;
  toolVersion: string;
  
  locataires: Locataire[];
  bailleurs: Bailleur[];
  biens: Bien[];
  bails: Bail[];
  pieces: Piece[];
  compteurs: Compteur[];
  mouvements: Mouvement[];

  constructor() {
    this.createdBy = '';
    this.creationDate = new Date();
    this.modifiedBy = '';
    this.modificationDate = new Date();
    this.toolVersion = '';
    this.locataires = [];
    this.bailleurs = [];
    this.biens = [];
    this.bails = [];
    this.pieces = [];
    this.compteurs = [];
    this.mouvements = [];
  }

  // Convert from JSON
  static fromJSON(input: any): EasylocData {

    var tmp = Object.assign(new EasylocData(), input);
    //Load pieces first as called from every other items
    if(input.pieces){
      tmp.pieces = [];
      for (const key of Object.keys(input.pieces)) {
        tmp.pieces.push(Piece.fromJSON(input.pieces[key]));
      }
    }
    //Load bailleurs as called by many other items
    if(input.bailleurs){
      tmp.bailleurs = [];
      for (const key of Object.keys(input.bailleurs)) {
        tmp.bailleurs.push(Bailleur.fromJSON(input.bailleurs[key], tmp.pieces));
      }
    }
    //Load locataires 
    if(input.locataires){
      tmp.locataires = [];
      for (const key of Object.keys(input.locataires)) {
        tmp.locataires.push(Locataire.fromJSON(input.locataires[key], tmp.pieces));
      }
    }
    //Load biens 
    if(input.biens){
      tmp.biens = [];
      for (const key of Object.keys(input.biens)) {
        tmp.biens.push(Bien.fromJSON(input.biens[key], tmp.bailleurs, tmp.pieces));
      }
    }
    //Load compteurs after biens
    if(input.compteurs){
      tmp.compteurs = [];
      for (const key of Object.keys(input.compteurs)) {
        tmp.compteurs.push(Compteur.fromJSON(input.compteurs[key], tmp.pieces, tmp.biens));
      }
    }
    //Load baux nearly last as need bien, locataire and pieces
    if(input.bails){
      tmp.bails = [];
      for (const key of Object.keys(input.bails)) {
        tmp.bails.push(Bail.fromJSON(input.bails[key], tmp.locataires, tmp.biens, tmp.pieces));
      }
    }
    //Load mouvements 
    if(input.mouvements){
      tmp.mouvements = [];
      for (const key of Object.keys(input.mouvements)) {
        tmp.mouvements.push(Mouvement.fromJSON(input.mouvements[key], tmp.biens, tmp.pieces));
      }
    }

    tmp.creationDate = new Date(tmp.creationDate);
    tmp.modificationDate = new Date(tmp.modificationDate);

    return tmp;
  }

  toJSON(): any {

    let serialize = {
      createdBy: this.createdBy,
      creationDate: this.creationDate,
      modifiedBy: this.modifiedBy,
      modificationDate: this.modificationDate,
      toolVersion: this.toolVersion,
      locataires: [''],
      bailleurs: [''],
      biens: [''],
      bails: [''],
      mouvements: [''],
      pieces: [''],
      compteurs: ['']
    };

    let serializeLocataires : any[] = [];
    this.locataires.forEach((locataire: Locataire) => {
      serializeLocataires.push(locataire.toJSON());
    });
    serialize.locataires = serializeLocataires;

    let serializeBailleurs : any[] = [];
    this.bailleurs.forEach((bailleur: Bailleur) => {
      serializeBailleurs.push(bailleur.toJSON());
    });
    serialize.bailleurs = serializeBailleurs;

    let serializeBiens : any[] = [];
    this.biens.forEach((bien: Bien) => {
      serializeBiens.push(bien.toJSON());
    });
    serialize.biens = serializeBiens;

    let serializeBails : any[] = [];
    this.bails.forEach((bail: Bail) => {
      serializeBails.push(bail.toJSON());
    });
    serialize.bails = serializeBails;

    let serializeMouvements : any[] = [];
    this.mouvements.forEach((mouvement: Mouvement) => {
      serializeMouvements.push(mouvement.toJSON());
    });
    serialize.mouvements = serializeMouvements;

    let serializeCompteurs : any[] = [];
    this.compteurs.forEach((compteur: Compteur) => {
      serializeCompteurs.push(compteur.toJSON());
    });
    serialize.compteurs = serializeCompteurs;

    let serializePieces : any[] = [];
    this.pieces.forEach((piece: Piece) => {
      serializePieces.push(piece.toJSON());
    });
    serialize.pieces = serializePieces;

    return serialize;
  }
}