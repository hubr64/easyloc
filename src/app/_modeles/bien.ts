
import { Bailleur } from './bailleur';
import { Piece } from './piece';
import { Mouvement } from './mouvement';

export const BIENTYPE: {[key: string]: string} = {
  'Meuble': "Appartement Meublé",
  'Vide': "Appartement Non meublé",
  'MeubleMaison': "Maison Meublé",
  'VideMaison': "Maison Non meublé",
  'Pro': "Local Professionnel",
  'Immeuble': 'Immeuble'
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
  dateAssurance: Date;
  commentaire: string;
  pieces: Piece[];
  bienslies: {
    bien: Bien,
    ratio: number
  }[];

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
    this.dateAssurance = new Date();
    this.commentaire = '';
    this.pieces = [];
    this.bienslies = [];
  }

  static fromJSON(input: any, docBailleurs: Bailleur[] = [], docPieces: Piece[] = [], docBiens: Bien[] = []): Bien {
    var tmp = Object.assign(new Bien(), input);
    //Build correct dates
    tmp.dateAchat = new Date(tmp.dateAchat);
    tmp.dateFabrication = new Date(tmp.dateFabrication);
    tmp.dateAssurance = new Date(tmp.dateAssurance);
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

    //Convert linked biens id to references to biens
    tmp.bienslies = [];   
    if(input.bienslies){ 
      input.bienslies.forEach((bienlie: any) => {
        docBiens.forEach((docBien:Bien) => {
          if(docBien.id == bienlie.bien){
            tmp.bienslies.push({
              bien:docBien,
              ratio: bienlie.ratio
            })
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
      dateAssurance: this.dateAssurance,
      commentaire: this.commentaire,
      pieces: [''],
      bienslies: ['']
    };

    let serializePieces : string[] = [];
    this.pieces.forEach((piece: Piece) => {
      serializePieces.push(piece.id);
    });
    serialize.pieces = serializePieces;

    let serializeBiensLies : any[] = [];
    this.bienslies.forEach((bienlie: any) => {
      serializeBiensLies.push({bien: bienlie.bien.id, ratio: bienlie.ratio});
    });
    serialize.bienslies = serializeBiensLies;

    return serialize;
  }

  toString(): string{
    return this.nom;
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

  public isImmeuble(): boolean{
    return this.type == 'Immeuble'
  }

  public getBienLieRatio(bien: Bien): any{
    let ratio: number = 0;
    //On regarde tout ses biens liés
    this.bienslies.forEach((bienlie: any) => {
      //Si l'un des biens lies correspond au bien que l'on recherche alors on retourne son ratio
      if(bienlie.bien.id == bien.id){
        ratio = bienlie.ratio;
      }
    });
    //On a rien trouvé on retourne un ratio nul
    return ratio;
  }

  public get surfaceTotale(): number {
    let surfaceTotale: number = this.surface;
    if(this.isImmeuble()){
      this.bienslies.forEach((bienlie: any) => {
        surfaceTotale += bienlie.bien.surface;
      });
    }
    return surfaceTotale;
  }

  public get nbPiecesTotal(): number {
    let nbPiecesTotal: number = this.nbPieces;
    if(this.isImmeuble()){
      this.bienslies.forEach((bienlie: any) => {
        nbPiecesTotal += bienlie.bien.nbPieces;
      });
    }
    return nbPiecesTotal;
  }

}