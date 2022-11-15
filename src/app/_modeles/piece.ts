export const PIECECODE: {[key: string]: string} = {
    'LOC_CNI': "Carte d'identité",
    'LOC_PSP': "Passeport",
    'BLR_STT': "Statut",
    'BAIL_IMPT': "Impôt sur le revenu",
    'BAIL_CTT': "Contrat de travail",
    'BAIL_SAL': "Bulletin de salaire",
    'BAIL_CAUT': "Acte de cautionnement",
    'BAIL_QUIT': "Quittance",
    'BAIL_JUSTIF': "Justificatif de domicile",
    'BAIL_RVN': "Autre justificatif de revenu",
    'BIEN_REGL': "Réglement de copropriété",
    'BIEN_DIAG': "Diagnostic technique",
    'BIEN_NOT': "Acte notarié",
    'BIEN_PHOT': "Photo",
    'BIEN_ANNO': "Annonce",
    'BIEN_ASSU': 'Assurance propriétaire non occupant',
    'BIEN_TRAV': 'Devis/Facture travaux',
    'BAIL_CONT': "Contrat de location",
    'BAIL_STV': "Etat des lieux vierge",
    'BAIL_STE': "Etat des lieux entrant",
    'BAIL_STS': "Etat des lieux sortant",
    'BAIL_ASSU': 'Assurance locataire',
    'DIVERS': "Divers"
}

export class Piece {
    id: string;
    nom: string;
    description: string;
    code: string;

    constructor() {
        this.id = '';
        this.nom = '';
        this.description = '';
        this.code = '';
    }

    static fromJSON(input: any): Piece {
        return Object.assign(new Piece(), input);
    }

    toJSON(): any {
        let serialize = {
            id: this.id,
            nom: this.nom,
            description: this.description,
            code: this.code
        };    
        return serialize;
    }

    toString(): string{
      return this.nom +" ("+ this.code+ ")";
    }
}