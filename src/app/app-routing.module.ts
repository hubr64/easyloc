import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ConfigurationComponent } from './configuration/configuration.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { BrowseComponent } from './browse/browse.component';
import { LocataireListeComponent } from './locataire-liste/locataire-liste.component';
import { LocataireDetailsComponent } from './locataire-details/locataire-details.component';
import { LocataireFicheComponent } from './locataire-fiche/locataire-fiche.component';
import { BailleurListeComponent } from './bailleur-liste/bailleur-liste.component';
import { BailleurDetailsComponent } from './bailleur-details/bailleur-details.component';
import { BienListeComponent } from './bien-liste/bien-liste.component';
import { BienDetailsComponent } from './bien-details/bien-details.component';
import { BienFicheComponent } from './bien-fiche/bien-fiche.component';
import { BailListeComponent } from './bail-liste/bail-liste.component';
import { BailDetailsComponent } from './bail-details/bail-details.component';
import { BailFicheComponent } from './bail-fiche/bail-fiche.component';
import { BailNewComponent } from './bail-new/bail-new.component';
import { PieceListeComponent } from './piece-liste/piece-liste.component';
import { MouvementListeComponent } from './mouvement-liste/mouvement-liste.component';
import { QuittancesComponent } from './quittances/quittances.component';
import { ConditionsComponent } from './conditions/conditions.component';
import { StatistiquesDetailsComponent } from './statistiques-details/statistiques-details.component';
import { StatistiquesImpotsComponent } from './statistiques-impots/statistiques-impots.component';

const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'browse', component: BrowseComponent },
  { path: 'configuration', component: ConfigurationComponent },
  { path: 'locataires', component: LocataireListeComponent },
  { path: 'locataire/:_id', component: LocataireDetailsComponent },
  { path: 'fiche/locataire/:_id', component: LocataireFicheComponent },
  { path: 'bailleurs', component: BailleurListeComponent },
  { path: 'bailleur/:_id', component: BailleurDetailsComponent },
  { path: 'biens', component: BienListeComponent },
  { path: 'bien/:_id', component: BienDetailsComponent },
  { path: 'fiche/bien/:_id', component: BienFicheComponent },
  { path: 'bails', component: BailListeComponent },
  { path: 'bail/:_id', component: BailDetailsComponent },
  { path: 'new/bail', component: BailNewComponent },
  { path: 'fiche/bail/:_id', component: BailFicheComponent },
  { path: 'mouvements', component: MouvementListeComponent },
  { path: 'quittance/:_mouvementid', component: QuittancesComponent },
  { path: 'pieces', component: PieceListeComponent },
  { path: 'conditions',  component: ConditionsComponent },
  { path: 'statistiques',  component: StatistiquesDetailsComponent },
  { path: 'impots',  component: StatistiquesImpotsComponent },
  { path: 'redirect',  component: DashboardComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
