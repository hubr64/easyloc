import { AfterViewInit , Component, ViewChild, Input, Inject } from '@angular/core';
import { Router } from '@angular/router';
import { SelectionModel } from '@angular/cdk/collections';
import { FormControl } from '@angular/forms';
import { Location } from '@angular/common';

import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTable } from '@angular/material/table';
import { MatTableDataSource} from '@angular/material/table';
import { MatDialog} from '@angular/material/dialog';

import { UserService } from '../_services/user.service';
import { AlertService } from '../_services/alert.service';
import { DocumentService } from '../_services/document.service';
import { ExportCsvService }      from '../_services/export-csv.service';
import { Bail } from '../_modeles/bail';
import { BAILTERMEPAIEMENT as bailTermePaiements } from '../_modeles/bail';
import { BAILTYPEPAIEMENT as bailTypePaiements } from '../_modeles/bail';
import { BAILPERIODEPAIEMENT as bailPeriodePaiements } from '../_modeles/bail';
import { Locataire } from '../_modeles/locataire';
import { Bien } from '../_modeles/bien';
import { DialogDeleteConfirmComponent } from '../dialog-delete-confirm/dialog-delete-confirm.component';

@Component({
  selector: 'app-bail-liste',
  templateUrl: './bail-liste.component.html',
  styleUrls: ['./bail-liste.component.scss']
})
export class BailListeComponent implements AfterViewInit {

  // COmponent input and output
  @Input() embedded: boolean = false;
  @Input() defaultBien: Bien;
  @Input() defaultLocataire: Locataire;

  // All table elements
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatTable) table!: MatTable<Bail>;
  public dataSource: MatTableDataSource<Bail>;

  // Columns displayed in the table. Columns IDs can be added, removed, or reordered.
  public displayedColumns = ['select', 'locataire', 'bien', 'dateDebut', 'dateFin', 'loyer', 'charges', 'total', 'paiement', 'impayes', 'pieces', 'actions'];
  public displayedColumnsEmbedded = ['locataire', 'bien', 'dateDebut', 'dateFin', 'loyer', 'impayes'];
  //Multi selection management
  public initialSelection = [];
  public allowMultiSelect: boolean = true;
  public selection: SelectionModel<Bail> = new SelectionModel<Bail>(this.allowMultiSelect, this.initialSelection);
  //Conversion of types in text
  public bailTermePaiements = bailTermePaiements;
  public bailTypePaiements = bailTypePaiements;
  public bailPeriodePaiements = bailPeriodePaiements;
  // String to manage the search filter
  public bienFilter = new FormControl('');
  public locataireFilter = new FormControl('');
  public searchFilter = new FormControl('');
  public typeFilter = new FormControl('');
  public filterValues: any = {
    bien: '',
    locataire: '',
    type: '',
    search: ''
  }

  constructor(
    public alertService: AlertService,
    public userService: UserService,
    public documentService: DocumentService,
    private exportCsvService: ExportCsvService,
    private router: Router,
    public dialog: MatDialog,
    private location: Location) { }

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
    if(this.defaultBien){
      this.bienFilter.setValue(this.defaultBien.id);
      this.filterValues.bien = this.defaultBien.id;
    }
    if(this.defaultLocataire){
      this.bienFilter.setValue(this.defaultLocataire.id);
      this.filterValues.locataire = this.defaultLocataire.id;
    }
    //Listen for filter change
    this.fieldListener();
  }

  private fieldListener() {
    this.bienFilter.valueChanges.subscribe((bien:string | null ) => {
      this.filterValues.bien = bien;
      this.dataSource.filter = JSON.stringify(this.filterValues);
    });
    this.locataireFilter.valueChanges.subscribe((locataire:string | null) => {
      this.filterValues.locataire = locataire;
      this.dataSource.filter = JSON.stringify(this.filterValues);
    });
    this.searchFilter.valueChanges.subscribe((search:string | null) => {
      this.filterValues.search = search;
      this.dataSource.filter = JSON.stringify(this.filterValues);
    });
    this.typeFilter.valueChanges.subscribe((type:string | null) => {
      this.filterValues.type = type;
      this.dataSource.filter = JSON.stringify(this.filterValues);
    });
  }

  getData(): void {
    //Create datasource from data
    this.dataSource = new MatTableDataSource(this.documentService.document.bails);
    // Add sort and paginator
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
    //Add filter parameters
    this.dataSource.filterPredicate = this.createFilter();
    this.dataSource.filter = JSON.stringify(this.filterValues);
    //Configure multi selection
    this.selection = new SelectionModel<Bail>(this.allowMultiSelect, this.initialSelection);
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

  private createFilter(): (bail: Bail, filter: string) => boolean {
    let filterFunction = function (bail: Bail, filter: string): boolean {
      let searchTerms = JSON.parse(filter);
      return (searchTerms.bien.length==0 || (searchTerms.bien.length>0 && bail.bien.id.indexOf(searchTerms.bien) !== -1))
        && (searchTerms.locataire.length==0 || (searchTerms.locataire.length>0 && bail.locataire.id.indexOf(searchTerms.locataire) !== -1))
        && (searchTerms.type.length==0 || (searchTerms.type.length>0 && ((searchTerms.type=='rented'&& !bail.dateFin) || (searchTerms.type=='unrented'&& bail.dateFin))))
        && JSON.stringify(bail.toJSON()).toLowerCase().indexOf(searchTerms.search.toLowerCase()) !== -1;
    }
    return filterFunction;
  }

  clearFilter(){
    this.searchFilter.setValue('');
    this.typeFilter.setValue('');
    if(!this.defaultLocataire){
      this.locataireFilter.setValue('');
    }
    if(!this.defaultBien){
      this.bienFilter.setValue('');
    }
  }

  public getTotalLoyer(): number{
    return  this.dataSource&&this.dataSource.filteredData?this.dataSource.filteredData.map(m => m.loyer).reduce((acc:any, value:any) => acc + value, 0):0;
  }

  public getTotalCharges(): number{
    return  this.dataSource&&this.dataSource.filteredData?this.dataSource.filteredData.map(m => m.charges).reduce((acc:any, value:any) => acc + value, 0):0;
  }

  edit(bail: Bail): void {
    //Change route to edition URL with prefilled fields, the name is used to get the item
    this.router.navigate(['/bail',  bail.id]);
  }

  delete(bail: Bail): void {
    //Display a confirmation dialog
    const dialogRef = this.dialog.open(DialogDeleteConfirmComponent, {
      data: {
        type: "ce bail",
        value: bail.toString(),
      },
    });

    dialogRef.afterClosed().subscribe((result:boolean) => {
      //If user confirm deletion
      if(result){
        //Remove in the global definition
        const index = this.documentService.document.bails.indexOf(bail, 0);
        if (index > -1) {
          this.documentService.document.bails.splice(index, 1);
        }
        // Update data source
        this.dataSource.data = this.documentService.document.bails;
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

  duplicate(bail: Bail){
    //Duplicate (deep-copy) and first change the name as we can not have the same name in the file
    const newBail = Bail.fromJSON(bail.toJSON(), this.documentService.document.locataires, this.documentService.document.biens, this.documentService.document.pieces);
    newBail.id = this.documentService.getUniqueId(4);
    //Add the current bail once again
    this.documentService.document.bails.push(newBail);
    // Update data source
    this.dataSource.data = this.documentService.document.bails;
    //Dislpay message
    this.alertService.success('La duplication est terminée.');
  }

  add(): void {
    //Change route to edition form with cleared fileds
    this.router.navigate(['/bail/new']);
  }

  export(): void {
    if(this.documentService.document.bails.length > 0)
    {
      var jsonToCsv = [];
      for (let bail of this.documentService.document.bails) {
        jsonToCsv.push({
          'Id':bail.id,
          'Locataire':bail.locataire.nom,
          'Bien':bail.bien.nom,
          'Début': bail.dateDebut.toLocaleDateString(),
          'Fin': bail.dateFin.toLocaleDateString(),
          'Durée (en j)': bail.duree,
          'Loyer': bail.loyer,
          'Charges': bail.charges,
          'Date Révision Loyer': bail.dateRevisionLoyer.toLocaleDateString(),
          'Périodicité paiement': bail.paiementPeriodicite,
          'Terme paiement': bail.paiementTerme,
          'Date paiement': bail.paiementDate.getDate()+"/"+bail.paiementDate.getMonth(),
          'Type paiement': bail.paiementType,
          'Commentaire': bail.commentaire
        });
      }
      this.exportCsvService.downloadFile(JSON.stringify(jsonToCsv),"baux");
    }else{
      this.alertService.error("Exportation impossible car il n'y a aucun bail dans la liste.");
    }
  }

  goBack(): void {
    this.location.back();
  }

}
