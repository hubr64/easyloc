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
    className: string;
    id: string;
    nom: string;
    description: string;
    code: string;

    constructor() {
        this.className = 'Piece';
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

    public get codeIcone() {

        var icone: string = "";

        switch(this.code) {
            case 'LOC_CNI'     : { icone = 'badge'; break; } 
            case 'LOC_PSP'     : { icone = 'badge'; break; }
            case 'BAIL_IMPT'   : { icone = 'account_balance'; break; }
            case 'BLR_STT'     : { icone = 'workspace_premium'; break; }
            case 'BAIL_CTT'    : { icone = 'business_center'; break; }
            case 'BAIL_SAL'    : { icone = 'request_quote'; break; }
            case 'BAIL_CAUT'   : { icone = 'family_restroom'; break; }
            case 'BAIL_QUIT'   : { icone = 'receipt_long'; break; }
            case 'BAIL_CONT'   : { icone = 'assignment'; break; }
            case 'BAIL_STV'    : { icone = 'check_box_outline_blank'; break; }
            case 'BAIL_STE'    : { icone = 'login'; break; }
            case 'BAIL_STS'    : { icone = 'logout'; break; }
            case 'BAIL_ASSU'   : { icone = 'admin_panel_settings'; break; }
            case 'DIVERS'      : { icone = 'description'; break; }
            case 'BIEN_TRAV'   : { icone = 'construction'; break; }
            case 'BIEN_DIAG'   : { icone = 'monitor_heart'; break; }
            case 'BIEN_PHOT'   : { icone = 'image'; break; }
            case 'BIEN_NOT'    : { icone = 'gavel'; break; }
            case 'BIEN_ASSU'   : { icone = 'shield'; break; }
            case 'BIEN_REGL'   : { icone = 'apartment'; break; }
            case 'BAIL_RVN'    : { icone = 'money'; break; }
            case 'BAIL_JUSTIF' : { icone = 'roofing'; break; }
            case 'BIEN_ANNO'   : { icone = 'newspaper'; break; }
            default: { icone = 'question_mark'; break; }
        }
        return icone;
    }
}