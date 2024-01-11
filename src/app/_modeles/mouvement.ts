
import { Bien } from './bien';
import { Piece } from './piece';

export class Mouvement {
  className: string;
  id: string;
  date: Date;
  bien: Bien;
  libelle: string;
  montant: number;
  tiers: string;
  quittance: Piece | null;
  commentaires: string;

  constructor() {
    this.className = 'Mouvement';
    this.id = '';
    this.date = new Date();
    this.bien = new Bien();
    this.libelle = '';
    this.montant = 0;
    this.tiers = '';
    this.quittance = null;
    this.commentaires = '';
  }

  static fromJSON(input: any, docBiens: Bien[] = [], docPieces: Piece[] = []): Mouvement {
    var tmp = Object.assign(new Mouvement(), input);
    //Build correct dates
    tmp.date = new Date(tmp.date);
    //Convert to number
    tmp.montant = parseFloat(tmp.montant);
    //Convert bien id to reference to bien
    if(input.bien){ 
        docBiens.forEach((docBien:Bien) => {
        if(docBien.id == input.bien){
          tmp.bien = docBien;
        }
      });
    }
    if(input.quittance){ 
      docPieces.forEach((docPiece:Piece) => {
      if(docPiece.id == input.quittance){
        tmp.quittance = docPiece;
      }
    });
  }
    return tmp;
  }

  toJSON(): any {
    let serialize = {
        id: this.id,
        date: this.date,
        bien: this.bien ? this.bien.id: '',
        libelle: this.libelle,
        montant: this.montant,
        tiers: this.tiers,
        quittance: this.quittance ? this.quittance.id: '',
        commentaires: this.commentaires
    };

    return serialize;
  }

  toString(): string{
    return this.libelle +" ("+ this.date.toLocaleDateString()+ ", "+ this.montant+ "€)";
  }

}