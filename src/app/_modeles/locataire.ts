import { Piece } from './piece';

export class Locataire {
  className: string;
  id: string;
  nom: string;
  telephone: string;
  mail: string;
  commentaire: string;
  pieces: Piece[];

  constructor() {
    this.className = 'Locataire';
    this.id = '';
    this.nom = '';
    this.telephone = '';
    this.mail = '';
    this.commentaire = '';
    this.pieces = [];
  }

  static fromJSON(input: any, docPieces: Piece[] = []): Locataire {
    var tmp = Object.assign(new Locataire(), input);
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
      telephone: this.telephone,
      mail: this.mail,
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
    return this.nom;
  }
}
