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
import { Bailleur } from '../_modeles/bailleur';
import { DialogDeleteConfirmComponent } from '../dialog-delete-confirm/dialog-delete-confirm.component';
import { MailComponent } from '../mail/mail.component';

@Component({
  selector: 'app-bailleur-liste',
  templateUrl: './bailleur-liste.component.html',
  styleUrls: ['./bailleur-liste.component.scss']
})
export class BailleurListeComponent implements AfterViewInit {

  // All table elements
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatTable) table!: MatTable<Bailleur>;
  public dataSource: MatTableDataSource<Bailleur>;

  // Columns displayed in the table. Columns IDs can be added, removed, or reordered.
  public displayedColumns = ['select', 'nom', 'type', 'telephone', 'mail', 'pieces', 'actions'];
  // String to get the search filter
  public searchFilter: string = '';
  //Multi selection management
  public initialSelection = [];
  public allowMultiSelect: boolean = true;
  public selection: SelectionModel<Bailleur> = new SelectionModel<Bailleur>(this.allowMultiSelect, this.initialSelection);

  constructor(
    public alertService: AlertService,
    public userService: UserService,
    public documentService: DocumentService,
    private exportCsvService: ExportCsvService,
    private router: Router,
    public dialog: MatDialog) { }

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
    this.dataSource = new MatTableDataSource(this.documentService.document.bailleurs);
    // Add sort and paginator
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
    //Configure multi selection
    this.selection = new SelectionModel<Bailleur>(this.allowMultiSelect, this.initialSelection);
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

  edit(bailleur: Bailleur): void {
    //Change route to edition URL with prefilled fields, the name is used to get the item
    this.router.navigate(['/bailleur',  bailleur.id]);
  }

  delete(bailleur: Bailleur): void {
    //Display a confirmation dialog
    const dialogRef = this.dialog.open(DialogDeleteConfirmComponent, {
      data: {
        type: "ce bailleur",
        value: bailleur.nom,
      },
    });

    dialogRef.afterClosed().subscribe((result:boolean) => {
      //If user confirm deletion
      if(result){
        //Remove in the global definition
        const index = this.documentService.document.bailleurs.indexOf(bailleur, 0);
        if (index > -1) {
          this.documentService.document.bailleurs.splice(index, 1);
        }
        // Update data source
        this.dataSource.data = this.documentService.document.bailleurs;
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

  duplicate(bailleur: Bailleur){
    //Duplicate (deep-copy) and first change the name as we can not have the same name in the file
    const newBailleur = Bailleur.fromJSON(bailleur.toJSON(), this.documentService.document.pieces);
    newBailleur.id = this.documentService.getUniqueId(4);
    //Add the current bailleur once again
    this.documentService.document.bailleurs.push(newBailleur);
    // Update data source
    this.dataSource.data = this.documentService.document.bailleurs;
    //Dislpay message
    this.alertService.success('La duplication est terminée.');
  }

  add(): void {
    //Change route to edition form with cleared fileds
    this.router.navigate(['/bailleur/new']);
  }

  export(): void {
    if(this.documentService.document.bailleurs.length > 0)
    {
      var jsonToCsv = [];
      for (let bailleur of this.documentService.document.bailleurs) {
        jsonToCsv.push({
          'Id':bailleur.id,
          'Nom':bailleur.nom,
          "Type":bailleur.type,
          "Adresse":bailleur.adresse,
          "Téléphone":bailleur.telephone,
          "Mail":bailleur.mail,
          "Immatriculation":bailleur.immatriculation,
          "Commentaire":bailleur.commentaire
        });
      }
      this.exportCsvService.downloadFile(JSON.stringify(jsonToCsv),"bailleurs");
    }else{
      this.alertService.error("Exportation impossible car il n'y a aucun bailleur dans la liste.");
    }
  }

  contact(bailleur:Bailleur){
    //Display the mail dialog
    const dialogRef = this.dialog.open(MailComponent, {
      data: {
        destinataires: bailleur.mail,
        emetteur: this.userService.currentUser.mail,
        sujet: "",
        contenu: "\r\n\r\nCordialement.\r\n"+this.userService.currentUser.nom
      },
    });
  }

  contactAll(){
    //Build list of bailleurs to contact
    var bailleursMail: string[] = [];
    for (let item of this.selection.selected) {
      bailleursMail.push(item.mail);
    }
    const mailsDest = bailleursMail.join(";");

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
}