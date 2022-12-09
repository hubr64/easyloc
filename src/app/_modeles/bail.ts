
import { Bien } from './bien';
import { Locataire } from './locataire';
import { Piece } from './piece';

export const BAILTERMEPAIEMENT: {[key: string]: string} = {
    'echu': "Therme échu",
    'echoir': "A échoir"
}
export const BAILTYPEPAIEMENT: {[key: string]: string} = {
    'virement': "Virement",
    'cheque': "Chèque",
    'liquide': "Liquide",
    'autre': "Autre"
}
export const BAILPERIODEPAIEMENT: {[key: string]: string} = {
    'semaine': "Hebdomadaire",
    'bimensuel': "Bimensuel",
    'mensuel': "Mensuel",
    'bimestriel': "Bimestriel",
    'trimestriel': "Trimestriel",
    'semestriel': "Semestriel",
    'annuel': "Annuel"
}

export class Bail {
    className: string;
    id: string;
    bien: Bien;
    locataire: Locataire;
    dateDebut: Date;
    dateFin: Date;
    duree: number;
    loyer: number;
    charges: number;
    dateRevisionLoyer: Date;
    paiementPeriodicite: string;
    paiementTerme: string;
    paiementDate: Date;
    paiementType: string;
    commentaire: string;
    pieces: Piece[];

    constructor() {
        this.className = 'Bail';
        this.id = '';
        this.bien = new Bien();
        this.locataire = new Locataire();
        this.dateDebut = new Date();
        this.dateFin = new Date();
        this.duree = 0;
        this.loyer = 0;
        this.charges = 0;
        this.dateRevisionLoyer = new Date();
        this.paiementPeriodicite = 'mensuel';
        this.paiementTerme = 'echoir';
        this.paiementDate = new Date();
        this.paiementType = 'virement';
        this.commentaire = '';
        this.pieces = [];
    }

  static fromJSON(input: any, docLocataires: Locataire[] = [], docBiens: Bien[] = [], docPieces: Piece[] = []): Bail {
    var tmp = Object.assign(new Bail(), input);
    //Build correct dates
    tmp.dateDebut = new Date(tmp.dateDebut);
    tmp.dateFin = tmp.dateFin?new Date(tmp.dateFin):null;
    tmp.dateRevisionLoyer = new Date(tmp.dateRevisionLoyer);
    tmp.paiementDate = new Date(tmp.paiementDate);
    //Convert to number
    tmp.duree = parseInt(tmp.duree);
    tmp.loyer = parseFloat(tmp.loyer);
    tmp.charges = parseFloat(tmp.charges);

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
    //Convert bien id to reference to bien
    if(input.bien){ 
        docBiens.forEach((docBien:Bien) => {
        if(docBien.id == input.bien){
          tmp.bien = docBien;
        }
      });
    }
    //Convert locataire id to reference to locataire
    if(input.locataire){ 
        docLocataires.forEach((docLocataire:Locataire) => {
        if(docLocataire.id == input.locataire){
          tmp.locataire = docLocataire;
        }
      });
    }
    return tmp;
  }

  toJSON(): any {
    let serialize = {
        id: this.id,
        bien: this.bien ? this.bien.id: '',
        locataire: this.locataire ? this.locataire.id: '',
        dateDebut: this.dateDebut,
        dateFin: this.dateFin,
        duree: this.duree,
        loyer: this.loyer,
        charges: this.charges,
        dateRevisionLoyer: this.dateRevisionLoyer,
        paiementPeriodicite: this.paiementPeriodicite,
        paiementTerme: this.paiementTerme,
        paiementDate: this.paiementDate,
        paiementType: this.paiementType,
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
    return this.locataire.nom +" ("+ this.bien.nom+ ")";
  }
  public get commentaireHTML() {
    return this.commentaire.replace(/\n/g,"<br/>");
  }

}