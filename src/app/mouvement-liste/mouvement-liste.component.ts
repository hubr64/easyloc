import { AfterViewInit, Component, ViewChild, Inject, Input, Output, EventEmitter } from '@angular/core';
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
import { Mouvement } from '../_modeles/mouvement';
import { Bien } from '../_modeles/bien';
import { DialogDeleteConfirmComponent } from '../dialog-delete-confirm/dialog-delete-confirm.component';
import { MouvementDetailsComponent } from '../mouvement-details/mouvement-details.component';
import { PiecesChoixComponent } from '../pieces-choix/pieces-choix.component';

@Component({
  selector: 'app-mouvement-liste',
  templateUrl: './mouvement-liste.component.html',
  styleUrls: ['./mouvement-liste.component.scss']
})
export class MouvementListeComponent implements AfterViewInit {

  // COmponent input and output
  @Input() embedded: boolean = false;
  @Input() defaultBien: Bien;
  @Output() selected = new EventEmitter<Mouvement[]>();

  // All table elements
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatTable) table!: MatTable<Mouvement>;
  public dataSource: MatTableDataSource<Mouvement>;

  // Columns displayed in the table. Columns IDs can be added, removed, or reordered.
  public displayedColumns = ['select', 'date', 'bien', 'libelle', 'montant', 'tiers', 'quittance', 'actions'];
  public displayedColumnsEmbedded = ['select', 'date', 'libelle', 'montant', 'quittance'];
  //Multi selection management
  public initialSelection = [];
  public allowMultiSelect: boolean = true;
  public selection: SelectionModel<Mouvement> = new SelectionModel<Mouvement>(this.allowMultiSelect, this.initialSelection);
  // String to manage the search filter
  public bienFilter = new FormControl('');
  public typeFilter = new FormControl('');
  public searchFilter = new FormControl('');
  public filterValues: any = {
    bien: '',
    type: '',
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
    this.typeFilter.valueChanges.subscribe((type:string | null) => {
      this.filterValues.type = type;
      this.dataSource.filter = JSON.stringify(this.filterValues);
    });
    this.searchFilter.valueChanges.subscribe((search:string | null) => {
      this.filterValues.search = search;
      this.dataSource.filter = JSON.stringify(this.filterValues);
    });
  }

  getData(): void {
    //Create datasource from data
    this.dataSource = new MatTableDataSource(this.documentService.document.mouvements);
    // Add sort and paginator
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
    //Add filter parameters
    this.dataSource.filterPredicate = this.createFilter();
    this.dataSource.filter = JSON.stringify(this.filterValues);
    //Configure multi selection
    this.selection = new SelectionModel<Mouvement>(this.allowMultiSelect, this.initialSelection);
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
        this.dataSource.data.forEach(row => this.selection.select(row));
  }

  private createFilter(): (mouvement: Mouvement, filter: string) => boolean {
    let filterFunction = function (mouvement: Mouvement, filter: string): boolean {
      let searchTerms = JSON.parse(filter);
      return (searchTerms.bien.length==0 || (searchTerms.bien.length>0 && mouvement.bien.id.indexOf(searchTerms.bien) !== -1))
        && (searchTerms.type.length==0 || (searchTerms.type.length>0 && ((searchTerms.type=='in'&& mouvement.montant > 0) || (searchTerms.type=='out'&& mouvement.montant < 0))))
        && JSON.stringify(mouvement.toJSON()).toLowerCase().indexOf(searchTerms.search.toLowerCase()) !== -1;
    }
    return filterFunction;
  }

  clearFilter(){
    this.searchFilter.setValue('');
    this.typeFilter.setValue('');
    if(!this.defaultBien){
      this.bienFilter.setValue('');
    }
  }

  public getTotal(): number{
    return  this.dataSource&&this.dataSource.filteredData?this.dataSource.filteredData.map(m => m.montant).reduce((acc:any, value:any) => acc + value, 0):0;
  }

  add(): void {
    //Display a confirmation dialog
    const dialogRef = this.dialog.open(MouvementDetailsComponent, {
      data: {
      },
    });

    dialogRef.afterClosed().subscribe((result:any) => {
      //If user confirm creation
      if(result){
        //Add in the global definition
        let tmpNew: Mouvement = Mouvement.fromJSON(result, this.documentService.document.biens, this.documentService.document.pieces);
        tmpNew.id = this.documentService.getUniqueId(4);
        this.documentService.document.mouvements.push(tmpNew);
        this.alertService.success('Le mouvement est maintenant ajouté.');

        // Update data source
        this.getData();
      // If user finally change his mind
      }else{
        this.alertService.error('L\'ajout a été annulé...');
      }
    });
  }

  edit(mouvement: Mouvement): void {
    //Display a confirmation dialog
    const dialogRef = this.dialog.open(MouvementDetailsComponent, {
      data: {
        mouvement: mouvement
      },
    });

    dialogRef.afterClosed().subscribe((result:any) => {
      //If user confirm update
      if(result){
        mouvement.date = result.date;
        mouvement.libelle = result.libelle;
        mouvement.montant = result.montant;
        mouvement.tiers = result.tiers;
        mouvement.commentaires = result.commentaires;
        this.documentService.document.biens.forEach((docBien:Bien) => {
          if(docBien.id == result.bien){
            mouvement.bien = docBien;
          }
        });

      // If user finally change his mind
      }else{
        this.alertService.error('La modification a été annulée...');
      }
    });
  }

  delete(mouvement: Mouvement): void {
    //Display a confirmation dialog
    const dialogRef = this.dialog.open(DialogDeleteConfirmComponent, {
      data: {
        type: "ce mouvement",
        value: mouvement.toString(),
      },
    });

    dialogRef.afterClosed().subscribe((result:boolean) => {
      //If user confirm deletion
      if(result){
        //Remove in the global definition
        const index = this.documentService.document.mouvements.indexOf(mouvement, 0);
        if (index > -1) {
          this.documentService.document.mouvements.splice(index, 1);
        }
        // Update data source
        this.dataSource.data = this.documentService.document.mouvements;
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

  duplicate(mouvement: Mouvement){
    //Duplicate (deep-copy) and first change the name as we can not have the same name in the file
    const newMouvement = Mouvement.fromJSON(mouvement.toJSON(), this.documentService.document.biens, this.documentService.document.pieces);
    newMouvement.id = this.documentService.getUniqueId(4);
    newMouvement.quittance = null;
    //Add the current mouvement once again
    this.documentService.document.mouvements.push(newMouvement);
    // Update data source
    this.dataSource.data = this.documentService.document.mouvements;
    this.dataSource.sort = this.sort;
    //Dislpay message
    this.alertService.success('La duplication est terminée.');
    //SHow edition form
    this.edit(newMouvement);
  }

  public export(): void {
    // If there is at least one mouvement to export
    if(this.documentService.document.mouvements.length > 0)
    {
      //Create an array to temporaly store the export data
      var jsonToCsv = [];
      // Browse all mouvements (as this is not limited to selection)
      for (let mouvement of this.documentService.document.mouvements) {
        jsonToCsv.push({
          'Id':mouvement.id,
          "Date":mouvement.date,
          "Bien":mouvement.bien.nom,
          "Libellé":mouvement.libelle,
          "Montant":mouvement.montant,
          "Tiers":mouvement.tiers,
          "Commentaires":mouvement.commentaires,
        });
      }
      // Use export service to automaticaly lauch the download process
      this.exportCsvService.downloadFile(JSON.stringify(jsonToCsv),"mouvements");
    }else{
      this.alertService.error("Exportation impossible car il n'y a aucun mouvement dans la liste.");
    }
  }

  public addQuittance(mouvement: Mouvement){
    //Display a dialog to add a piece
    const dialogRef = this.dialog.open(PiecesChoixComponent, {
      data: {
        multiple: false
      }
    });

    dialogRef.afterClosed().subscribe((result:any) => {
      //If user has choosed a file
      if(result){
        // If one or more
        if(result.length>0){
          //For each file selected
          result.forEach((piece:any) => {
            mouvement.quittance = piece;
          });
        }
      }
    });
  }

  public generateQuittance(mouvement: Mouvement){
    //Change route to edition form with cleared fileds
    this.router.navigate(['/quittance',  mouvement.id]);
  }

}