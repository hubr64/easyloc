import { AfterViewInit , Component, ViewChild, Input, Inject } from '@angular/core';
import { Router } from '@angular/router';
import { SelectionModel } from '@angular/cdk/collections';
import { FormControl } from '@angular/forms';

import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTable } from '@angular/material/table';
import { MatTableDataSource} from '@angular/material/table';
import { MatDialog} from '@angular/material/dialog';

import { UserService } from '../_services/user.service';
import { AlertService } from '../_services/alert.service';
import { DocumentService } from '../_services/document.service';
import { ExportCsvService }      from '../_services/export-csv.service';
import { Bien } from '../_modeles/bien';
import { BIENTYPE as bienTypes } from '../_modeles/bien';
import { Bailleur } from '../_modeles/bailleur';
import { DialogDeleteConfirmComponent } from '../dialog-delete-confirm/dialog-delete-confirm.component';

@Component({
  selector: 'app-bien-liste',
  templateUrl: './bien-liste.component.html',
  styleUrls: ['./bien-liste.component.scss']
})
export class BienListeComponent implements AfterViewInit {

  // COmponent input and output
  @Input() embedded: boolean = false;
  @Input() defaultProprietaire: Bailleur;

  // All table elements
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatTable) table!: MatTable<Bien>;
  public dataSource: MatTableDataSource<Bien>;

  // Columns displayed in the table. Columns IDs can be added, removed, or reordered.
  public displayedColumns = ['select', 'nom', 'type', 'adresse', 'dateAchat', 'surface', 'entrees', 'sorties', 'etat', 'pieces', 'actions'];
  public displayedColumnsEmbedded = ['nom', 'adresse', 'surface', 'etat'];

  //Multi selection management
  public initialSelection = [];
  public allowMultiSelect: boolean = true;
  public selection: SelectionModel<Bien> = new SelectionModel<Bien>(this.allowMultiSelect, this.initialSelection);
  // String to manage the search filter
  public bailleurFilter = new FormControl('');
  public searchFilter = new FormControl('');
  public filterValues: any = {
    bailleur: '',
    search: ''
  }
  //Conversion of bien types in text
  public bienTypes = bienTypes;

  constructor(
    public alertService: AlertService,
    public userService: UserService,
    public documentService: DocumentService,
    private exportCsvService: ExportCsvService,
    private router: Router,
    public dialog: MatDialog
  ) { 
  }

  ngAfterViewInit(): void {
    // SUbscribe in case the document was reloaded
    this.documentService.docIsLoadedChange.subscribe((isLoaded: boolean) => {
      if(isLoaded){
        this.getData();
      }
    });
    //GEt data at first launch if document is already loaded
    if(this.documentService.docIsLoaded){
      setTimeout(()=>this.getData(),0);
    }
    //Manage default filtering if a bien is selected
    if(this.defaultProprietaire){
      this.bailleurFilter.setValue(this.defaultProprietaire.id);
      this.filterValues.bailleur = this.defaultProprietaire.id;
    }
    //Listen for filter change
    this.fieldListener();
  }

  private fieldListener() {
    this.bailleurFilter.valueChanges.subscribe((bailleur:string | null) => {
      this.filterValues.bailleur = bailleur;
      this.dataSource.filter = JSON.stringify(this.filterValues);
    });
    this.searchFilter.valueChanges.subscribe((search:string | null) => {
      this.filterValues.search = search;
      this.dataSource.filter = JSON.stringify(this.filterValues);
    });
  }

  getData(): void {
    //Create datasource from data
    this.dataSource = new MatTableDataSource(this.documentService.document.biens);
    // Add sort and paginator
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
    //Add filter parameters
    this.dataSource.filterPredicate = this.createFilter();
    this.dataSource.filter = JSON.stringify(this.filterValues);
    //Configure multi selection
    this.selection = new SelectionModel<Bien>(this.allowMultiSelect, this.initialSelection);
  }

  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.data.length;
    return numSelected == numRows;
  }

  masterToggle() {
    this.isAllSelected() ?
        this.selection.clear() :
        this.dataSource.filteredData.forEach(row => this.selection.select(row));
  }

  private createFilter(): (bien: Bien, filter: string) => boolean {
    let filterFunction = function (bien: Bien, filter: string): boolean {
      let searchTerms = JSON.parse(filter);
      return (searchTerms.bailleur.length==0 || (searchTerms.bailleur.length>0 && bien.proprietaire.id.indexOf(searchTerms.bailleur) !== -1))
        && JSON.stringify(bien.toJSON()).toLowerCase().indexOf(searchTerms.search.toLowerCase()) !== -1;
    }
    return filterFunction;
  }

  clearFilter(){
    this.searchFilter.setValue('');
    if(!this.defaultProprietaire){
      this.bailleurFilter.setValue('');
    }
  }

  edit(bien: Bien): void {
    //Change route to edition URL with prefilled fields, the name is used to get the item
    this.router.navigate(['/bien',  bien.id]);
  }

  delete(bien: Bien): void {
    //Display a confirmation dialog
    const dialogRef = this.dialog.open(DialogDeleteConfirmComponent, {
      data: {
        type: "ce bien",
        value: bien.nom,
      },
    });

    dialogRef.afterClosed().subscribe((result:boolean) => {
      //If user confirm deletion
      if(result){
        //Remove in the global definition
        const index = this.documentService.document.biens.indexOf(bien, 0);
        if (index > -1) {
          this.documentService.document.biens.splice(index, 1);
        }
        // Update data source
        this.dataSource.data = this.documentService.document.biens;
      // If user finally change his mind
      }else{
        this.alertService.error('La suppression a été annulée...');
      }
    });

  }

  deleteAll(): void {
    for (let item of this.selection.selected) {
      this.delete(item);
    }
  }

  duplicate(bien: Bien){
    //Duplicate (deep-copy) and first change the name as we can not have the same name in the file
    const newBien = Bien.fromJSON(bien.toJSON(), this.documentService.document.bailleurs, this.documentService.document.pieces, this.documentService.document.biens);
    newBien.id = this.documentService.getUniqueId(4);
    //Add the current bien once again
    this.documentService.document.biens.push(newBien);
    // Update data source
    this.dataSource.data = this.documentService.document.biens;
    //Dislpay message
    this.alertService.success('La duplication est terminée.');
  }

  add(): void {
    //Change route to edition form with cleared fileds
    this.router.navigate(['/bien/new']);
  }

  export(): void {
    if(this.documentService.document.biens.length > 0)
    {
      var jsonToCsv = [];
      for (let bien of this.documentService.document.biens) {
        jsonToCsv.push({
          'Id':bien.id,
          'Nom':bien.nom,
          "Description":bien.description,
          "Type":bien.type,
          "Adresse":bien.adresse,
          "Proprietaire":bien.proprietaire.nom,
          "Syndic":bien.syndic,
          "Fabrication":bien.dateFabrication.toLocaleDateString(),
          "Achat":bien.dateAchat.toLocaleDateString(),
          "Prix d'achat":this.documentService.getPrixAchatTotal(bien),
          "Surface (m²)":bien.surface,
          "Nb Pièces":bien.nbPieces,
          "Parking":bien.parking,
          "Assurance":bien.dateAssurance.toLocaleDateString(),
          "Commentaire":bien.commentaire
        });
      }
      this.exportCsvService.downloadFile(JSON.stringify(jsonToCsv),"biens");
    }else{
      this.alertService.error("Exportation impossible car il n'y a aucun bien dans la liste.");
    }
  }

}