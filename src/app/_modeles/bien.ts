
import { Bailleur } from './bailleur';
import { Piece } from './piece';
import { Mouvement } from './mouvement';

export const BIENTYPE: {[key: string]: string} = {
  'Meuble': "Appartement Meublé",
  'Vide': "Appartement Non meublé",
  'MeubleMaison': "Maison Meublé",
  'VideMaison': "Maison Non meublé",
  'Pro': "Local Professionnel",
}

export class Bien {
  className: string;
  id: string;
  nom: string;
  description: string;
  type: string;
  adresse: string;
  proprietaire: Bailleur;
  syndic: string;
  syndicUrl: string;
  dateFabrication: Date;
  dateAchat: Date;
  prixAchat: number;
  surface: number;
  nbPieces: number;
  parking: string;
  commentaire: string;
  pieces: Piece[];


  constructor() {
    this.className = 'Bien';
    this.id = '';
    this.nom = '';
    this.description = '';
    this.type = 'Vide';
    this.adresse = '';
    this.proprietaire = new Bailleur();
    this.syndic = '';
    this.syndicUrl = '';
    this.dateFabrication = new Date();
    this.dateAchat = new Date();
    this.prixAchat = 0;
    this.surface = 0;
    this.nbPieces = 0;
    this.parking = '';
    this.commentaire = '';
    this.pieces = [];
  }

  static fromJSON(input: any, docBailleurs: Bailleur[] = [], docPieces: Piece[] = []): Bien {
    var tmp = Object.assign(new Bien(), input);
    //Build correct dates
    tmp.dateAchat = new Date(tmp.dateAchat);
    tmp.dateFabrication = new Date(tmp.dateFabrication);
    //Convert to number
    tmp.prixAchat = parseFloat(tmp.prixAchat);
    tmp.surface = parseFloat(tmp.surface);
    tmp.nbPieces = parseInt(tmp.nbPieces);

    //Convert pieces id to references to pieces
    tmp.pieces = [];   
    if(input.pieces){ 
      input.pieces.forEach((pieceId: string) => {
        docPieces.forEach((docPiece:Piece) => {
          if(docPiece.id == pieceId){
            tmp.pieces.push(docPiece)
          }
        });
      });
    }
    //Convert bailleur id to references to bailleur
    if(input.proprietaire){ 
      docBailleurs.forEach((docBailleur:Bailleur) => {
        if(docBailleur.id == input.proprietaire){
          tmp.proprietaire = docBailleur;
        }
      });
    }
    return tmp;
  }

  toJSON(): any {
    let serialize = {
      id: this.id,
      nom: this.nom,
      description: this.description,
      type: this.type,
      adresse: this.adresse,
      proprietaire: this.proprietaire ? this.proprietaire.id: '',
      syndic: this.syndic,
      syndicUrl: this.syndicUrl,
      dateFabrication: this.dateFabrication,
      dateAchat: this.dateAchat,
      prixAchat: this.prixAchat,
      surface: this.surface,
      nbPieces: this.nbPieces,
      parking: this.parking,
      commentaire: this.commentaire,
      pieces: [''],
    };

    let serializePieces : string[] = [];
    this.pieces.forEach((piece: Piece) => {
      serializePieces.push(piece.id);
    });
    serialize.pieces = serializePieces;

    return serialize;
  }

  toString(): string{
    return this.nom;
  }

  public getYearRentability(mouvements:Mouvement[]): number{
    //Get current date
    const currentDate = new Date();
    //Compute start of year from current date
    const startYearDate = new Date(currentDate.getFullYear(), 0, 1);
    //Get all mouvements in the document
    var yearIn: number = 0;
    mouvements.forEach((mouvement:Mouvement) => {
      if(mouvement.bien == this){
        //If mouvement happens after the beginning of the year and if it is positive
        if(mouvement.date >= startYearDate && mouvement.montant>0){
          //Add it depending whether it is positive or negative
          yearIn += mouvement.montant;
        }
      }
    });
    //Return result or 0 if prixAchat is undefined
    return (yearIn / this.prixAchat) || 0;
  }

  public getBilan(mouvements:Mouvement[]): number{
    var mouvementsSum: number = 0;
    mouvements.forEach((mouvement:Mouvement) => {
      if(mouvement.bien == this){
        mouvementsSum = mouvementsSum + mouvement.montant
      }
    });
    //Return result
    return Math.round(mouvementsSum*100)/100;
  }

  public getInOutMontant(mouvements:Mouvement[]): any{

    //Get current date
    const currentDate = new Date();
    //Compute start of month from current date
    const startMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    //Compute start of year from current date
    const startYearDate = new Date(currentDate.getFullYear(), 0, 1);

    var inOut = {
      month: {'in': 0,'out': 0},
      year: {'in': 0,'out': 0},
      total: {'in': 0,'out': 0},
    }

    mouvements.forEach((mouvement:Mouvement) => {
      if(mouvement.bien == this){
        //If mouvement happens after the beginning of the month
        if(mouvement.date >= startMonthDate){
          //Add it depending whether it is positive or negative
          mouvement.montant>0?inOut.month.in += mouvement.montant : inOut.month.out+=Math.abs(mouvement.montant);
        }
        //If mouvement happens after the beginning of the year
        if(mouvement.date >= startYearDate){
          //Add it depending whether it is positive or negative
          mouvement.montant>0?inOut.year.in += mouvement.montant : inOut.year.out+=Math.abs(mouvement.montant);
        }
        //Global amounts
        mouvement.montant>0?inOut.total.in += mouvement.montant : inOut.total.out+=Math.abs(mouvement.montant);
      }
    });
    //Everything is round to avoid decimals display pb
    inOut.month.in = Math.round(inOut.month.in*100)/100;
    inOut.month.out = Math.round(inOut.month.out*100)/100;
    inOut.year.in = Math.round(inOut.year.in*100)/100;
    inOut.year.out = Math.round(inOut.year.out*100)/100;
    inOut.total.in = Math.round(inOut.total.in*100)/100;
    inOut.total.out = Math.round(inOut.total.out*100)/100;

    return inOut;
  }

  public get descriptionHTML(){
    return this.description.replace(/\n/g,"<br/>");
  }
  public get commentaireHTML() {
    return this.commentaire.replace(/\n/g,"<br/>");
  }
  public get adresseHTML() {
    return this.adresse.replace(/\n/g,"<br/>");
  }

}