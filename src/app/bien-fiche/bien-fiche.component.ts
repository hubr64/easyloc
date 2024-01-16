import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';

import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTable } from '@angular/material/table';
import { MatTableDataSource} from '@angular/material/table';

import { Bien, BIENTYPE } from '../_modeles/bien';
import { Mouvement } from '../_modeles/mouvement';
import { Bail } from '../_modeles/bail';
import { BAILTERMEPAIEMENT as bailTermePaiements } from '../_modeles/bail';
import { BAILTYPEPAIEMENT as bailTypePaiements } from '../_modeles/bail';
import { BAILPERIODEPAIEMENT as bailPeriodePaiements } from '../_modeles/bail';
import { UserService } from '../_services/user.service';
import { AlertService } from '../_services/alert.service';
import { DocumentService } from '../_services/document.service';
import { ConfigurationService } from '../_services/configuration.service';

@Component({
  selector: 'app-bien-fiche',
  templateUrl: './bien-fiche.component.html',
  styleUrls: ['./bien-fiche.component.scss']
})
export class BienFicheComponent implements OnInit, AfterViewInit {

  //The current bien
  public bien: Bien = new Bien();
  public bienType = BIENTYPE;
  //L'éventuel immeuble auqel appartient le bien
  public immeuble: Bien|null;

  //All bails for the current bien
  public bails: Bail[];
  //Conversion of types in text
  public bailTermePaiements = bailTermePaiements;
  public bailTypePaiements = bailTypePaiements;
  public bailPeriodePaiements = bailPeriodePaiements;
  // All table elements for mouvements
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatTable) table!: MatTable<Mouvement>;
  public dataSource: MatTableDataSource<Mouvement>;
  public displayedColumns = ['type', 'date', 'libelle', 'montant', 'tiers','immeuble'];
  //All mouvements for the current bien
  public mouvements: Mouvement[];
  //Tous les mouvements de l'éventuel immeuble du bien
  public mouvementsImmeuble: Mouvement[];
  //Get in configuration the mandatary pieces for the piece container provided
  public piecesObligatoires: string;
  //The HTML element that contains element to display in PDF
  @ViewChild('fiche') fiche: ElementRef;
  //Toggle visibility of various elements
  [key: string]: any;
  public eventsVisibility: boolean = true;
  public compteursVisibility: boolean = true;
  public mouvementsVisibility: boolean = true;
  public bailsVisibility: boolean = true;
  public piecesVisibility: boolean = true;

  constructor(
    private route: ActivatedRoute,
    private location: Location,
    public userService: UserService,
    public configurationService: ConfigurationService,
    public documentService: DocumentService,
    private alertService: AlertService
  ) { }

  ngOnInit(): void {
    //Get all required pieces
    this.piecesObligatoires = this.configurationService.getValue("piecesObligatoiresBien");

    //Get data
    this.getData();

    //If document is reloaded then get data again and recompute list of mouvements
    this.documentService.docIsLoadedChange.subscribe((isLoaded: boolean) => {
      if(isLoaded){
          this.getData();
          this.getMouvements();
      }
    });
  }

  ngAfterViewInit(): void {
    //Get mouvements for this bien
    this.getMouvements();
  }

  getData(): void {
    //Get parameter id to check if it's new or existing
    const reqId = this.route.snapshot.paramMap.get('_id');
    //If an existing one is edited
    if(reqId){
      //Look for the requested one in the list
      for (var _i = 0; _i < this.documentService.document.biens.length; _i++) {
        // Find the requested one
        if(this.documentService.document.biens[_i].id == reqId){
          this.bien = this.documentService.document.biens[_i];
        }
      }
      // If the requseted one can not be found (normally impossible) go back;
      if(!this.bien){
        this.goBack();
        this.alertService.error('Impossible de trouver le bien demandé !');
      }else{
        this.bails = [];
        for (var _i = 0; _i < this.documentService.document.bails.length; _i++) {
          // Find the requested one
          if(this.documentService.document.bails[_i].bien.id == reqId){
            this.bails.push(this.documentService.document.bails[_i]);
          }
        }
      }

      //On reupère l'éventuel immeuble associé
      this.immeuble = this.documentService.getImmeuble(this.bien);

    // NO one requested
    }else{
      this.goBack();
      this.alertService.error('Aucun bien demandé !');
    }
  }

  public getMouvements(){
    this.mouvements = [];
    for (var _i = 0; _i < this.documentService.document.mouvements.length; _i++) {
      // Find the requested one
      if(this.documentService.document.mouvements[_i].bien.id == this.bien.id){
        this.mouvements.push(this.documentService.document.mouvements[_i]);
      }
    }

    this.mouvementsImmeuble = [];
    if(this.immeuble){
      for (var _i = 0; _i < this.documentService.document.mouvements.length; _i++) {
        // Find the requested one
        if(this.documentService.document.mouvements[_i].bien.id == this.immeuble.id){
          this.mouvementsImmeuble.push(this.documentService.document.mouvements[_i]);
        }
      }
    }

    // Configure table
    this.dataSource = new MatTableDataSource(this.mouvements.concat(this.mouvementsImmeuble));
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
  }

  public goBack(): void {
    this.location.back();
  }

  public printFiche(){
    setTimeout(()=>window.print(),1000);
  }

  public toggleVisibily($event:any, visibleCard: string){
    this[visibleCard] = !this[visibleCard] ;
    $event.stopPropagation();

  }

}
