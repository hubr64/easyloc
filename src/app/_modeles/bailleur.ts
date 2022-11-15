
import { Piece } from './piece';

export enum BailleurType {
  Physique = "Physique",
  Morale = "Morale"
}

export class Bailleur {
  id: string;
  nom: string;
  type: BailleurType;
  adresse: string;
  telephone: string;
  mail: string;
  immatriculation: string;
  signature: string;
  commentaire: string;
  pieces: Piece[];

  constructor() {
    this.id = '';
    this.nom = '';
    this.type = BailleurType.Physique;
    this.adresse = '';
    this.telephone = '';
    this.mail = '';
    this.immatriculation = '';
    this.signature = '';
    this.commentaire = '';
    this.pieces = [];
  }

  static fromJSON(input: any, docPieces: Piece[] = []): Bailleur {
    var tmp = Object.assign(new Bailleur(), input);
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
    return tmp;
  }

  toJSON(): any {
    let serialize = {
      id: this.id,
      nom: this.nom,
      type: this.type,
      adresse: this.adresse,
      telephone: this.telephone,
      mail: this.mail,
      immatriculation: this.immatriculation,
      signature: this.signature,
      commentaire: this.commentaire,
      pieces: ['']
    };

    let serializePieces : string[] = [];
    this.pieces.forEach((piece: Piece) => {
      serializePieces.push(piece.id);
    });
    serialize.pieces = serializePieces;

    return serialize;
  }

  toString(): string{
    return this.nom + (this.immatriculation?' ('+this.immatriculation+')':'');
  }

}