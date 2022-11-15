'use strict';

export const CONFIG: { [key: string]: any } = {
  "storagePrefix": 'easyloc-',
  "configurationPrefix": 'config-',
  "messageDuration" : 3,
  'autoSaveDuration': 1,
  'autoSave': true,
  'defaultTheme': 'dark',
  'quittanceFileNamePrefix': 'quittance_',
  'quittanceMailSujet': 'Quittance',
  'quittanceMailText': 'Bonjour,\r\n\r\nVeuillez trouver ci-joint la quittance pour %%.\r\n\r\nCordialement.\r\n\r\n',
  'quittanceLocalisation': 'Labatmale',
  'piecesObligatoiresBien': 'BIEN_REGL,BIEN_DIAG,BIEN_NOT,BIEN_ANNO,BIEN_ASSU',
  'piecesObligatoiresLocataire': 'LOC_CNI|LOC_PSP',
  'piecesObligatoiresBailleur': 'BLR_STT|LOC_CNI',
  'piecesObligatoiresBail': 'BAIL_CONT,BAIL_STE|BAIL_STS,BAIL_IMPT,BAIL_CTT|BAIL_SAL|BAIL_RVN,BAIL_CAUT,LOC_CNI,BAIL_ASSU',
  'bailUnpaiedLoyerNb': 3,
  'dureeRevisionLoyer': 365,
  'nbCheckQuittance': 12,
  'impotDeductionForfaitaire': 0.3,
  'mouvementAutoCompleteIn': 'Loyer;Régularisation de charges;Remboursement',
  'mouvementAutoCompleteOut': 'Taxe foncière;Assurance prêt immobilier;Assurance PNO;Provision sur charges;Intérêts d\'emprunt;Frais de dossier prêt immobilier;Travaux;Achat;Régularisation de charges',
  'nomModeleAnnoncePapier': 'Modèle Annonce Web',
  'nomModeleAnnonceWeb': 'Modèle Annonce Papier',
}

