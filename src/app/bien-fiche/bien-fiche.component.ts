import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';

import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTable } from '@angular/material/table';
import { MatTableDataSource} from '@angular/material/table';
import { MatDialog} from '@angular/material/dialog';

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
  public displayedColumns = ['type', 'date', 'libelle', 'montant', 'tiers'];
  //All mouvements for the current bien
  public mouvements: Mouvement[];
  //Get in configuration the mandatary pieces for the piece container provided
  public piecesObligatoires: string;
  //The HTML element that contains element to display in PDF
  @ViewChild('fiche') fiche: ElementRef;

  constructor(
    private route: ActivatedRoute,
    private location: Location,
    public dialog: MatDialog,
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
  }

  ngAfterViewInit(): void {
    
    this.mouvements = [];
    for (var _i = 0; _i < this.documentService.document.mouvements.length; _i++) {
      // Find the requested one
      if(this.documentService.document.mouvements[_i].bien.id == this.bien.id){
        this.mouvements.push(this.documentService.document.mouvements[_i]);
      }
    }
    
    // Configure table
    this.dataSource = new MatTableDataSource(this.mouvements);
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
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
    // NO one requested
    }else{
      this.goBack();
      this.alertService.error('Aucun bien demandé !');
    }
  }

  public goBack(): void {
    this.location.back();
  }

  public printFiche(){
    setTimeout(()=>window.print(),1000);
  }

}
