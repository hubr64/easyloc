import { AfterViewInit , Component, ViewChild, Inject } from '@angular/core';
import { Router } from '@angular/router';
import { SelectionModel } from '@angular/cdk/collections';

import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTable } from '@angular/material/table';
import { MatTableDataSource} from '@angular/material/table';
import { MatDialog} from '@angular/material/dialog';

import { UserService } from '../_services/user.service';
import { AlertService } from '../_services/alert.service';
import { DocumentService } from '../_services/document.service';
import { ExportCsvService }      from '../_services/export-csv.service';
import { Locataire } from '../_modeles/locataire';
import { Bail } from '../_modeles/bail';
import { Bien } from '../_modeles/bien';
import { DialogDeleteConfirmComponent } from '../dialog-delete-confirm/dialog-delete-confirm.component';
import { MailComponent } from '../mail/mail.component';

@Component({
  selector: 'app-locataire-liste',
  templateUrl: './locataire-liste.component.html',
  styleUrls: ['./locataire-liste.component.scss']
})
export class LocataireListeComponent implements AfterViewInit {

  // All table elements
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatTable) table!: MatTable<Locataire>;
  public dataSource: MatTableDataSource<Locataire>;

  // Columns displayed in the table. Columns IDs can be added, removed, or reordered.
  public displayedColumns = ['select', 'nom', 'telephone', 'mail', 'bien', 'evenements', 'pieces', 'actions'];
  // String to get the search filter
  public searchFilter: string = '';
  //Multi selection management
  public initialSelection = [];
  public allowMultiSelect: boolean = true;
  public selection: SelectionModel<Locataire> = new SelectionModel<Locataire>(this.allowMultiSelect, this.initialSelection);

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
  }

  getData(): void {
    //Create datasource from data
    this.dataSource = new MatTableDataSource(this.documentService.document.locataires);
    // Add sort and paginator
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
    //Configure multi selection
    this.selection = new SelectionModel<Locataire>(this.allowMultiSelect, this.initialSelection);
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

  applyFilter(event: any) {
    //If user push escape then qui field and reset otherwise filter
    if(event.keyCode == 27){
      this.clearFilter();
    }else{
      //Get value from input field
      const filterValue = this.searchFilter;
      //Add the filter after cleaning the request
      this.dataSource.filter = filterValue.trim().toLowerCase();
    }
  }

  clearFilter(){
    //Clear filter string
    this.searchFilter = '';
    //Apply the cleared filter
    this.dataSource.filter = this.searchFilter;
  }

  edit(locataire: Locataire): void {
    //Change route to edition URL with prefilled fields, the name is used to get the item
    this.router.navigate(['/locataire',  locataire.id]);
  }

  delete(locataire: Locataire): void {
    //Display a confirmation dialog
    const dialogRef = this.dialog.open(DialogDeleteConfirmComponent, {
      data: {
        type: "ce locataire",
        value: locataire.nom,
      },
    });

    dialogRef.afterClosed().subscribe((result:boolean) => {
      //If user confirm deletion
      if(result){
        //Remove in the global definition
        const index = this.documentService.document.locataires.indexOf(locataire, 0);
        if (index > -1) {
          this.documentService.document.locataires.splice(index, 1);
        }
        // Update data source
        this.dataSource.data = this.documentService.document.locataires;
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

  duplicate(locataire: Locataire){
    //Duplicate (deep-copy) and first change the name as we can not have the same name in the file
    const newLocataire = Locataire.fromJSON(locataire.toJSON(), this.documentService.document.pieces);
    newLocataire.id = this.documentService.getUniqueId(4);
    //Add the current locataire once again
    this.documentService.document.locataires.push(newLocataire);
    // Update data source
    this.dataSource.data = this.documentService.document.locataires;
    //Dislpay message
    this.alertService.success('La duplication est terminée.');
  }

  add(): void {
    //Change route to edition form with cleared fileds
    this.router.navigate(['/locataire/new']);
  }

  export(): void {
    if(this.documentService.document.locataires.length > 0)
    {
      var jsonToCsv = [];
      for (let locataire of this.documentService.document.locataires) {
        jsonToCsv.push({
          'Id':locataire.id,
          'Nom':locataire.nom,
          "Téléphone":locataire.telephone,
          "Mail":locataire.mail,
          "Commentaire":locataire.commentaire});
      }
      this.exportCsvService.downloadFile(JSON.stringify(jsonToCsv),"locataires");
    }else{
      this.alertService.error("Exportation impossible car il n'y a aucun locataire dans la liste.");
    }
  }

  contact(locataire:Locataire){
    //Display the mail dialog
    const dialogRef = this.dialog.open(MailComponent, {
      data: {
        destinataires: locataire.mail,
        emetteur: this.userService.currentUser.mail,
        sujet: "",
        contenu: "\r\n\r\nCordialement.\r\n"+this.userService.currentUser.nom
      },
    });
  }

  contactAll(){
    //Build list of locataires to contact
    var locatairesMail: string[] = [];
    for (let item of this.selection.selected) {
      locatairesMail.push(item.mail);
    }
    const mailsDest = locatairesMail.join(";");

    //Display the mail dialog
    const dialogRef = this.dialog.open(MailComponent, {
      data: {
        destinataires: mailsDest,
        emetteur: this.userService.currentUser.mail,
        sujet: "",
        contenu: "\r\n\r\nCordialement.\r\n"+this.userService.currentUser.nom
      }
    });
  }

  getBail(locataire: Locataire): Bail | undefined{
    var tmpBail;
    this.documentService.document.bails.forEach((bail:Bail) => {
      if(bail.locataire.id == locataire.id){
        tmpBail = bail;
      }
    });
    return tmpBail;
  }

  getBienLoue(locataire: Locataire): Bien|null{
    var bail = this.getBail(locataire);
    if(bail){
      return bail.bien;
    }else{
      return null
    }
  }
}