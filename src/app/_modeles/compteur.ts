import { Piece } from './piece';
import { Bien } from './bien';

export class CompteurValue {

    className: string;
    dateReleve: Date;
    valeur: any;
    preuve: Piece | null;
    commentaires: string;
  
    constructor() {
      this.className = 'CompteurValue';
      this.dateReleve = new Date();
      this.preuve = null;
      this.commentaires = '';
    }

    static fromJSON(input: any, docPieces: Piece[] = []): CompteurValue {
        var tmp: CompteurValue = Object.assign(new CompteurValue(), input);
        //Build correct dates
        tmp.dateReleve = new Date(tmp.dateReleve);

        //Convert piece id to references to pieces
        if(input.preuve){ 
            docPieces.forEach((docPiece:Piece) => {
                if(docPiece.id == input.preuve){
                    tmp.preuve = docPiece;
                }
            });
        }
        return tmp;
    }

    toJSON(): any {
        let serialize = {
            dateReleve: this.dateReleve,
            valeur: this.valeur,
            preuve: this.preuve ? this.preuve.id : '',
            commentaires: this.commentaires
        };
        return serialize;
    }
  
    toString(): string{
      return this.valeur + " (" + this.dateReleve.toLocaleDateString() + ")";
    }
  
  }

export class Compteur {
    className: string;
    id: string;
    designation: string;
    unite: string;
    bien: Bien;
    commentaires: string;
    valeurs : CompteurValue[];

    constructor() {
        this.className = 'Compteur';
        this.id = '';
        this.designation = '';
        this.unite = '';
        this.commentaires = '';
        this.valeurs = [];
    }

    static fromJSON(input: any, docPieces: Piece[] = [], docBiens: Bien[] = []): Compteur {
        var tmp: Compteur = Object.assign(new Compteur(), input);

        //Convert bien id to reference to bien
        if(input.bien){ 
            docBiens.forEach((docBien:Bien) => {
                if(docBien.id == input.bien){
                    tmp.bien = docBien;
                }
            });
        }
        //Load valeurs
        if(input.valeurs){
            tmp.valeurs = [];
            for (const key of Object.keys(input.valeurs)) {
                if(input.valeurs[key] && input.valeurs[key]!= "" && input.valeurs[key]!= ""){
                    tmp.valeurs.push(CompteurValue.fromJSON(input.valeurs[key], docPieces));
                }
            }
        }
        return tmp;
    }

    toJSON(): any {
        let serialize = {
            id: this.id,
            designation: this.designation,
            unite: this.unite,
            bien: this.bien ? this.bien.id: '',
            commentaires: this.commentaires,
            valeurs: ['']
        };
        this.valeurs.forEach((valeur: CompteurValue) => {
            serialize.valeurs.push(valeur.toJSON());
        });
        return serialize;
    }

    toString(): string{
        return this.bien.nom + " - " + this.designation + " (" + this.id + ")";
    }

    public get derniereValeur(): CompteurValue|null {
        var last: CompteurValue|null = null;
        this.valeurs.forEach((valeur: CompteurValue) => {
            if(!last || (last && valeur.dateReleve > last.dateReleve) ){
                last = valeur;
            }
        });
        return last?last: null;
    }

}