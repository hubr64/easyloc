import { Injectable } from '@angular/core';

import * as Configuration from '../_helpers/global';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ConfigurationService {

  //Storage profeix in local memory
  public storageConfigurationPrefix = Configuration.CONFIG["storagePrefix"] + Configuration.CONFIG["configurationPrefix"];
  //COnfiguration items mixed from static and local saved
  public configurationItems: any;
  // Configuration categories
  public categories : any[];
  
  constructor() {

    console.log("ConfigurationService:constructor");

    // Create categories
    this.categories = [
      {'id':'tune', 'title':'Général'},
      {'id':'web_asset', 'title':'Interface graphique'},
      {'id':'save','title':'Enregistrement'},
      {'id':'receipt_long','title':'Quittances'},
      {'id':'notifications','title':'Evènements'},
    ];
    // Create configuration and init it from global configuration
    this.configurationItems = {
      'messageDuration': { advanced: true, title: 'Durée des messages (en s)', value: Configuration.CONFIG["messageDuration"], categorie: 'tune' },
      'autoSave': { advanced: false, title: 'Sauvegarde automatique des modifications', value: Configuration.CONFIG["autoSave"], categorie: 'save' },
      'autoSaveDuration': { advanced: true, title: 'Fréquence de détection des modifications (en s)', value: Configuration.CONFIG["autoSaveDuration"], categorie: 'save' },
      'autoSyncDuration': { advanced: true, title: 'Fréquence de détection de synchronisation (en s)', value: Configuration.CONFIG["autoSyncDuration"], categorie: 'save' },
      'defaultTheme': { advanced: false, title: 'Thème par défaut (light|dark)', value: Configuration.CONFIG["defaultTheme"], categorie: 'web_asset' },
      'quittanceLocalisation': { advanced: false, title: 'Lieu par défaut pour la quittance', value: Configuration.CONFIG["quittanceLocalisation"], categorie: 'receipt_long' },
      'quittanceFileNamePrefix': { advanced: false, title: 'Préfixe des fichiers de quittance', value: Configuration.CONFIG["quittanceFileNamePrefix"], categorie: 'receipt_long' },
      'quittanceMailSujet': { advanced: false, title: 'Sujet du mail envoyé avec les quittances', value: Configuration.CONFIG["quittanceMailSujet"], categorie: 'receipt_long' },
      'quittanceMailText': { advanced: false, title: 'Texte du mail envoyé avec les quittance (%% remplacé par la période)', value: Configuration.CONFIG["quittanceMailText"], categorie: 'receipt_long' },
      'piecesObligatoiresBien': { advanced: false, title: 'Pièces obligatoires pour un bien', value: Configuration.CONFIG["piecesObligatoiresBien"], categorie: 'notifications' },
      'piecesObligatoiresLocataire': { advanced: false, title: 'Pièces obligatoires pour un locataire', value: Configuration.CONFIG["piecesObligatoiresLocataire"], categorie: 'notifications' },
      'piecesObligatoiresBailleur': { advanced: false, title: 'Pièces obligatoires pour un bailleur', value: Configuration.CONFIG["piecesObligatoiresBailleur"], categorie: 'notifications' },
      'piecesObligatoiresBail': { advanced: false, title: 'Pièces obligatoires pour un bail', value: Configuration.CONFIG["piecesObligatoiresBail"], categorie: 'notifications' },
      'bailUnpaiedLoyerNb': { advanced: false, title: 'Nombre de mois à analyser pour loyer impayé', value: Configuration.CONFIG["bailUnpaiedLoyerNb"], categorie: 'notifications' },
      'dureeRevisionLoyer': { advanced: false, title: 'Durée avant nouvelle révision de loyer (en jours)', value: Configuration.CONFIG["dureeRevisionLoyer"], categorie: 'notifications' },
      'nbCheckQuittance': { advanced: false, title: 'Nombre de mois à analyser pour paiement sans quittance', value: Configuration.CONFIG["nbCheckQuittance"], categorie: 'notifications' },
      'impotDeductionForfaitaire': { advanced: false, title: 'Taux de déduction forfaitaire des revenus imposables', value: Configuration.CONFIG["impotDeductionForfaitaire"], categorie: 'tune' },
      'mouvementAutoCompleteIn': { advanced: false, title: 'Proposition textes de mouvements entrants (séparé par ";")', value: Configuration.CONFIG["mouvementAutoCompleteIn"], categorie: 'web_asset' },
      'mouvementAutoCompleteOut': { advanced: false, title: 'Proposition textes de mouvements sortants (séparé par ";")', value: Configuration.CONFIG["mouvementAutoCompleteOut"], categorie: 'web_asset' },
      'nomModeleAnnoncePapier': { advanced: false, title: 'Nom du modèle par défaut pour une annonce de location en version papier', value: Configuration.CONFIG["nomModeleAnnoncePapier"], categorie: 'tune' },
      'nomModeleAnnonceWeb': { advanced: false, title: 'Nom du modèle par défaut pour une annonce de location en version Web', value: Configuration.CONFIG["nomModeleAnnonceWeb"], categorie: 'tune' },
      'ordreBien': { advanced: false, title: 'Ordre d\'affichage des biens par défaut (nom|dateAchat)', value: Configuration.CONFIG["ordreBien"], categorie: 'web_asset' },
      'datePaiementTaxe': { advanced: false, title: 'Date de paiement limite pour les taxes foncières', value: Configuration.CONFIG["datePaiementTaxe"], categorie: 'notifications' },
    };

    // Load local storage that replace the global initial storage
    this.load();
  }

  load() {
    for (let [key, value] of Object.entries(this.configurationItems)) {
      const tmpConfig = localStorage.getItem(this.storageConfigurationPrefix + key);
      if (tmpConfig) {
        this.configurationItems[key].value = tmpConfig;
      }
    }
    console.log("Configure retrieved from local memory");
  }

  getValue(index: string) {
    if(this.configurationItems[index]){
      return this.configurationItems[index].value;
    }else{
      return '';
    }
  }

  setValue(index: string, value: string) {
    //Only save if possible and if value has changed
    if (this.configurationItems[index] && this.configurationItems[index].value != value) {
      //Update current config
      this.configurationItems[index].value = value;
      // Set in local memory
      localStorage.setItem(this.storageConfigurationPrefix + index, value);
    }
  }

  initValue(index: string) {
    //If the value is correctly defined
    if (this.configurationItems[index]) {
      //Back current to default value
      this.configurationItems[index].value = Configuration.CONFIG[index];
      //Remove from local memory
      localStorage.removeItem(this.storageConfigurationPrefix + index);
    }
  }  
}
