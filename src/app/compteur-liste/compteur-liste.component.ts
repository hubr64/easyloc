import { AfterViewInit, Component, ViewChild, Inject, Input, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { SelectionModel } from '@angular/cdk/collections';
import { FormControl } from '@angular/forms';

import { MatPaginator } from '@angular/material/paginator';
import { MatSort, Sort } from '@angular/material/sort';
import { MatTable } from '@angular/material/table';
import { MatTableDataSource} from '@angular/material/table';
import { MatDialog} from '@angular/material/dialog';

import { AlertService } from '../_services/alert.service';
import { DocumentService } from '../_services/document.service';
import { ExportCsvService }      from '../_services/export-csv.service';
import { Compteur, CompteurValue } from '../_modeles/compteur';
import { Bien } from '../_modeles/bien';
import { DialogDeleteConfirmComponent } from '../dialog-delete-confirm/dialog-delete-confirm.component';
import { CompteurDetailsComponent } from '../compteur-details/compteur-details.component';

@Component({
  selector: 'app-compteur-liste',
  templateUrl: './compteur-liste.component.html',
  styleUrls: ['./compteur-liste.component.scss']
})
export class CompteurListeComponent {

  // COmponent input and output
  @Input() embedded: boolean = false;
  @Input() defaultBien: Bien;
  @Output() selected = new EventEmitter<Compteur[]>();

  // All table elements
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatTable) table!: MatTable<Compteur>;
  public dataSource: MatTableDataSource<Compteur>;

  // Columns displayed in the table. Columns IDs can be added, removed, or reordered.
  public displayedColumns = ['select', 'bien', 'designation', 'derniereValeur', 'nbValeur', 'actions'];
  public displayedColumnsEmbedded = ['select', 'designation', 'derniereValeur', 'nbValeur', 'actions'];
  //Multi selection management
  public initialSelection = [];
  public allowMultiSelect: boolean = true;
  public selection: SelectionModel<Compteur> = new SelectionModel<Compteur>(this.allowMultiSelect, this.initialSelection);
  // String to manage the search filter
  public bienFilter = new FormControl('');
  public searchFilter = new FormControl('');
  public filterValues: any = {
    bien: '',
    search: ''
  }

  constructor(
    public alertService: AlertService,
    public documentService: DocumentService,
    private exportCsvService: ExportCsvService,
    private router: Router,
    public dialog: MatDialog
  ) {}

  ngAfterViewInit(): void {
    // Subscribe in case the document was reloaded
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
    if(this.defaultBien){
      this.bienFilter.setValue(this.defaultBien.id);
      this.filterValues.bien = this.defaultBien.id;
    }
    //Listen for filter change
    this.fieldListener();
  }

  private fieldListener() {
    this.bienFilter.valueChanges.subscribe((bien:string | null) => {
      this.filterValues.bien = bien;
      this.dataSource.filter = JSON.stringify(this.filterValues);
    });
    this.searchFilter.valueChanges.subscribe((search:string | null) => {
      this.filterValues.search = search;
      this.dataSource.filter = JSON.stringify(this.filterValues);
    });
  }

  getData(): void {
    //Create datasource from data
    this.dataSource = new MatTableDataSource(this.documentService.document.compteurs);
    // Add sort and paginator
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
    //Add filter parameters
    this.dataSource.filterPredicate = this.createFilter();
    this.dataSource.filter = JSON.stringify(this.filterValues);
    //Configure multi selection
    this.selection = new SelectionModel<Compteur>(this.allowMultiSelect, this.initialSelection);
    this.selection.changed.subscribe(()=>{
      this.selected.emit(this.selection.selected);
    })
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

  private createFilter(): (compteur: Compteur, filter: string) => boolean {
    let filterFunction = (compteur: Compteur, filter: string): boolean => {
      let searchTerms = JSON.parse(filter);
      return (searchTerms.bien.length==0 || (searchTerms.bien.length>0 && compteur.bien.id.indexOf(searchTerms.bien) !== -1))
        && JSON.stringify(compteur.toJSON()).toLowerCase().indexOf(searchTerms.search.toLowerCase()) !== -1;
    }
    return filterFunction;
  }

  clearFilter(){
    this.searchFilter.setValue('');
    if(!this.defaultBien){
      this.bienFilter.setValue('');
    }
  }

  add(): void {
    //Display a confirmation dialog
    const dialogRef = this.dialog.open(CompteurDetailsComponent, {
      data: {
      },
    });

    dialogRef.afterClosed().subscribe((result:any) => {
      //If user confirm creation
      if(result){
        //Add in the global definition
        let tmpNew: Compteur = Compteur.fromJSON(result, this.documentService.document.pieces, this.documentService.document.biens);
        this.documentService.document.compteurs.push(tmpNew);
        this.alertService.success('Le compteur est maintenant ajouté.');
        // Update data source
        this.getData();
      // If user finally change his mind
      }else{
        this.alertService.error('L\'ajout a été annulé...');
      }
    });
  }

  edit(compteur: Compteur): void {
    //Display a confirmation dialog
    const dialogRef = this.dialog.open(CompteurDetailsComponent, {
      data: {
        compteur: compteur
      },
    });

    dialogRef.afterClosed().subscribe((result:any) => {
      //If user confirm update
      if(result){
        compteur.id = result.id;
        compteur.designation = result.designation;
        this.documentService.document.biens.forEach((docBien:Bien) => {
          if(docBien.id == result.bien){
            compteur.bien = docBien;
          }
        });
        //Refresh sort (as it doesn't sort automaticlly after update)
        const sortState: Sort = {active: this.sort.active, direction: this.sort.direction};
        this.sort.sortChange.emit(sortState);
      // If user finally change his mind
      }else{
        this.alertService.error('La modification a été annulée...');
      }
    });
  }

  delete(compteur: Compteur): void {
    //Display a confirmation dialog
    const dialogRef = this.dialog.open(DialogDeleteConfirmComponent, {
      data: {
        type: "ce compteur",
        value: compteur.toString(),
      },
    });

    dialogRef.afterClosed().subscribe((result:boolean) => {
      //If user confirm deletion
      if(result){
        //Remove in the global definition
        const index = this.documentService.document.compteurs.indexOf(compteur, 0);
        if (index > -1) {
          this.documentService.document.compteurs.splice(index, 1);
        }
        // Update data source
        this.dataSource.data = this.documentService.document.compteurs;
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

  duplicate(compteur: Compteur){
    //Duplicate (deep-copy) and first change the name as we can not have the same name in the file
    const newCompteur = Compteur.fromJSON(compteur.toJSON(), this.documentService.document.pieces, this.documentService.document.biens);
    //Add the current mouvement once again
    this.documentService.document.compteurs.push(newCompteur);
    // Update data source
    this.dataSource.data = this.documentService.document.compteurs;
    //Dislpay message
    this.alertService.success('La duplication est terminée.');
    //Show edition form
    this.edit(newCompteur);
  }

  public export(): void {
    // If there is at least one mouvement to export
    if(this.documentService.document.compteurs.length > 0)
    {
      //Create an array to temporaly store the export data
      var jsonToCsv = [];
      // Browse all mouvements (as this is not limited to selection)
      for (let compteur of this.documentService.document.compteurs) {
        jsonToCsv.push({
          'Id':compteur.id,
          "Designation":compteur.designation,
          "Bien":compteur.bien.nom,
          "Valeurs":compteur.valeurs.join(",")
        });
      }
      // Use export service to automaticaly lauch the download process
      this.exportCsvService.downloadFile(JSON.stringify(jsonToCsv),"compteurs");
    }else{
      this.alertService.error("Exportation impossible car il n'y a aucun compteur dans la liste.");
    }
  }

  public addValeur(compteur: Compteur){
    /*
    //Display a confirmation dialog
    const dialogRef = this.dialog.open(CompteurValueDetailsComponent, {
      data: {
        compteur: compteur
      },
    });

    dialogRef.afterClosed().subscribe((result:any) => {
      //If user confirm add
      if(result){
        //Add in the global definition
        let tmpNew: CompteurValue = CompteurValue.fromJSON(result, this.documentService.document.pieces);
        compteur.valeurs.push(tmpNew);
        //TODO : gérer la pièce
        this.alertService.success('La nouvelle valeur de compteur est maintenant ajoutée.');
        // Update data source
        this.getData();
      // If user finally change his mind

      // If user finally change his mind
      }else{
        this.alertService.error("L'ajout d'une valeur a été annulée...");
      }
    });
    */
  }
}