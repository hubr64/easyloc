import { AfterViewInit, Component, ViewChild, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
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
import { DriveService } from '../_services/drive.service';
import { ExportCsvService }      from '../_services/export-csv.service';
import { Mouvement } from '../_modeles/mouvement';
import { Bien } from '../_modeles/bien';
import { DialogDeleteConfirmComponent } from '../dialog-delete-confirm/dialog-delete-confirm.component';
import { MouvementDetailsComponent } from '../mouvement-details/mouvement-details.component';
import { PiecesChoixComponent } from '../pieces-choix/pieces-choix.component';
import { ImportComponent } from '../import/import.component';
import { ImportConfirmComponent } from '../import-confirm/import-confirm.component';

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
  public displayedColumnsEmbedded = ['select', 'date', 'libelle', 'montant', 'quittance', 'actions'];
  public displayedColumnsDefaultBien = ['select', 'date', 'libelle', 'montant_ratio', 'quittance', 'actions'];
  //Multi selection management
  public initialSelection = [];
  public allowMultiSelect: boolean = true;
  public selection: SelectionModel<Mouvement> = new SelectionModel<Mouvement>(this.allowMultiSelect, this.initialSelection);
  public lastMouvements: Mouvement[];
  // String to manage the search filter
  public bienFilter = new FormControl<string[]>([]);
  public typeFilter = new FormControl('');
  public searchFilter = new FormControl('');
  public startDateFilter = new FormControl<Date | null>(null);
  public endDateFilter = new FormControl<Date | null>(null);
  public filterValues: {
    bien: string[]|null,
    type: string|null,
    search: string|null,
    startDate: Date|null,
    endDate: Date|null
  } = {
    bien: [],
    type: '',
    search: '',
    startDate: null,
    endDate: null
  }

  //URL for each quittance
  public urlQuittances: {[key: string]: string} = {};
  //404 error for each quittance
  public errorQuittances: {[key: string]: number} = {};
  //Permet de mémroiser l'éventuel immeuble d'un bien
  public defaultBienImmeuble: Bien;

  constructor(
    public alertService: AlertService,
    public documentService: DocumentService,
    private exportCsvService: ExportCsvService,
    public driveService: DriveService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    public dialog: MatDialog
  ) {
    this.lastMouvements = [];
  }

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

      let bienToFilter = [this.defaultBien.id];

      //S'il le bien par défaut est associé à un immeuble
      let immeuble = this.documentService.getImmeuble(this.defaultBien);
      if(immeuble){
        //On mémorise l'immeuble
        this.defaultBienImmeuble = immeuble;
        //Alors on ajoute cet immeuble dans le filtre par défaut
        bienToFilter.push(immeuble.id);
      }

      this.bienFilter.setValue(bienToFilter);
      this.filterValues.bien = bienToFilter;
    }else{
      let allBienArray = this.documentService.document.biens.map(obj => obj.id);
      this.bienFilter.setValue(allBienArray);
      this.filterValues.bien = allBienArray;
    }
    //Listen for filter change
    this.fieldListener();
  }

  public bienFilterAll(evt:any){
    if(this.filterValues.bien && this.filterValues.bien?.length < this.documentService.document.biens.length){
      this.bienFilter.setValue(this.documentService.document.biens.map(obj => obj.id));
    }else{
      this.bienFilter.setValue([]);
    }
    this.bienFilter.markAsTouched()
    evt.stopPropagation();
  }

  private fieldListener() {
    this.bienFilter.valueChanges.subscribe((bien:string[] | null) => {
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
    this.startDateFilter.valueChanges.subscribe((startDate:Date | null) => {
      this.filterValues.startDate = startDate;
      this.dataSource.filter = JSON.stringify(this.filterValues);
    });
    this.endDateFilter.valueChanges.subscribe((endDate:Date | null) => {
      this.filterValues.endDate = endDate;
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
    //Get download link for each quittance
    this.documentService.document.mouvements.forEach((mouvement:Mouvement) => {
      if(mouvement.quittance && mouvement.quittance.id){
        this.driveService.get(mouvement.quittance.id).then( 
          (response: any) => {
            if(mouvement.quittance && mouvement.quittance.id){
              this.urlQuittances[mouvement.quittance.id] = response.result.webContentLink;
              this.cdr.detectChanges();
            }
          },
          (error:any) => {
            if(error.status==404){
              if(mouvement.quittance && mouvement.quittance.id){
                this.errorQuittances[mouvement.quittance.id] = error.status;
                this.cdr.detectChanges();
              }
            }
          }
        );
      }
    });
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

  private createFilter(): (mouvement: Mouvement, filter: string) => boolean {
    let filterFunction = function (mouvement: Mouvement, filter: string): boolean {
      let searchTerms = JSON.parse(filter);
      if(searchTerms.startDate){searchTerms.startDate = new Date(searchTerms.startDate);}
      if(searchTerms.endDate){searchTerms.endDate = new Date(searchTerms.endDate);}
      return ((searchTerms.bien.length>0 && searchTerms.bien.indexOf(mouvement.bien.id) !== -1))
        && (searchTerms.type.length==0 || (searchTerms.type.length>0 && ((searchTerms.type=='in'&& mouvement.montant > 0) || (searchTerms.type=='out'&& mouvement.montant < 0) )))
        && (searchTerms.startDate == null || (searchTerms.startDate!=null && mouvement.date.getTime() >= searchTerms.startDate.getTime()))
        && (searchTerms.endDate == null || (searchTerms.endDate!=null && mouvement.date.getTime() <= searchTerms.endDate.getTime()))
        && JSON.stringify(mouvement.toJSON()).toLowerCase().indexOf(searchTerms.search.toLowerCase()) !== -1;
    }
    return filterFunction;
  }

  clearFilter(){
    this.searchFilter.setValue('');
    this.typeFilter.setValue('');
    if(!this.defaultBien){
      this.bienFilter.setValue(this.documentService.document.biens.map(obj => obj.id));
    }
    this.startDateFilter.setValue(null);
    this.endDateFilter.setValue(null);
  }

  public getTotal(): number{

    let total: number = 0;
    if(this.dataSource && this.dataSource.filteredData){
      this.dataSource.filteredData.forEach(filteredMouvement => {
        if(this.defaultBienImmeuble && filteredMouvement.bien==this.defaultBienImmeuble){
          total += filteredMouvement.montant * this.defaultBienImmeuble.getBienLieRatio(this.defaultBien) / 100;
        }else{
          total += filteredMouvement.montant;
        }
      });      
    }

    return total;
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
        this.lastMouvements = [];
        //Add in the global definition
        let tmpNew: Mouvement = Mouvement.fromJSON(result, this.documentService.document.biens, this.documentService.document.pieces);
        tmpNew.id = this.documentService.getUniqueId(4);
        this.documentService.document.mouvements.push(tmpNew);
        this.alertService.success('Le mouvement est maintenant ajouté.');
        this.lastMouvements.push(tmpNew);
        // Update data source
        this.getData();
      // If user finally change his mind
      }else{
        this.alertService.error('L\'ajout a été annulé...');
      }
    });
  }

  edit(mouvement: Mouvement): void {
    //Display the edition dialog
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
        mouvement.montant = parseFloat(result.montant);
        mouvement.tiers = result.tiers;
        mouvement.commentaires = result.commentaires;
        this.documentService.document.biens.forEach((docBien:Bien) => {
          if(docBien.id == result.bien){
            mouvement.bien = docBien;
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

  duplicate(mouvement: Mouvement){

    //Display the edition dialog
    const dialogRef = this.dialog.open(MouvementDetailsComponent, {
      data: {
        mouvement: mouvement
      },
    });

    dialogRef.afterClosed().subscribe((result:any) => {
      //If user confirm creation
      if(result){
        this.lastMouvements = [];
        //Add in the global definition
        let tmpNew: Mouvement = Mouvement.fromJSON(result, this.documentService.document.biens, this.documentService.document.pieces);
        tmpNew.id = this.documentService.getUniqueId(4);
        tmpNew.quittance = null;
        this.documentService.document.mouvements.push(tmpNew);
        this.alertService.success('Le mouvement est maintenant dupliqué après modifications.');
        this.lastMouvements.push(tmpNew);
        // Update data source
        this.getData();
        //Refresh sort (as it doesn't sort automaticlly after update)
        const sortState: Sort = {active: this.sort.active, direction: this.sort.direction};
        this.sort.sortChange.emit(sortState);
        
      // If user finally change his mind
      }else{
        this.alertService.error('La duplication a été annulée...');
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

  public import(): void{
    //Display an import dialog
    const dialogRef = this.dialog.open(ImportComponent, {
      data: {
        multiple: false,
        authorisedExtensions: ['.csv', '.txt'],
        authorisedTypes: ['text/csv', 'text/plain'],
        encoding: 'ISO-8859-1'
      }
    });

    dialogRef.afterClosed().subscribe((result:any) => {
      //If user has choosed a file
      if(result){
        if(result.length>0){
          //Get content of the file
          var fileContent = result[0];

          //Create the object that will contain all the mouvement to import
          var mouvementsToImport: Mouvement[] = [];

          //Extract columns name
          const propertyNames = fileContent.slice(0,fileContent.indexOf('\r\n')).split(';');
          //Extract valu lines
          const dataRows = fileContent.slice(fileContent.indexOf('\r\n')+1).split('\r\n');

          //There must have 6 columns exaclty
          if(propertyNames.length == 6){
            //Order of columns matter
            if(propertyNames[0]=="Date" && propertyNames[1]=="Bien" && propertyNames[2]=="Libellé" && propertyNames[3]=="Montant" && propertyNames[4]=="Tiers" && propertyNames[5]=="Commentaires"){
              //If there is enough lines
              if(dataRows.length > 0){
                //All global control ended then browse values lines
                dataRows.forEach((dataRow: any) => {
                  //Extract columns of each value
                  let mouvement = dataRow.split(";");
                  if(mouvement.length == 6){
                    //Create a temporary mouvement
                    let tmpMouvement = new Mouvement();
                    //Fill the mouvement with all the information
                    tmpMouvement.id = this.documentService.getUniqueId(4);

                    var dateParts = mouvement[0].trim().split("/");
                    tmpMouvement.date = new Date(+dateParts[2], dateParts[1] - 1, +dateParts[0]);
                    
                    this.documentService.document.biens.forEach( (bien:Bien) => {
                      if(bien.nom == mouvement[1].trim()){
                        tmpMouvement.bien = bien;
                      }
                    });
                    tmpMouvement.libelle = mouvement[2].trim();
                    tmpMouvement.montant = parseFloat(mouvement[3].trim());
                    tmpMouvement.tiers = mouvement[4].trim();
                    tmpMouvement.quittance = null;
                    tmpMouvement.commentaires = mouvement[5].trim();

                    //Check that mandaotry information are filled
                    if(isNaN(tmpMouvement.date.getTime()) || tmpMouvement.bien.nom=='' || tmpMouvement.libelle=='' || tmpMouvement.tiers=='' || isNaN(tmpMouvement.montant)){
                      console.error("Mouvement non conforme : " + dataRow);
                      console.error("Date : " + isNaN(tmpMouvement.date.getTime()));
                      console.error("Montant : " + isNaN(tmpMouvement.montant));
                      console.error("Bien : " + tmpMouvement.bien.nom);
                      console.error("Autre : " + tmpMouvement.libelle=='' || tmpMouvement.tiers=='');
                    }else{
                      //Add the mouvement to the temporary list
                      mouvementsToImport.push(tmpMouvement);
                    }
                  }
                });
                console.dir(mouvementsToImport);

                if(mouvementsToImport.length>0){

                  //Display a confirmation popup with the computed temporay mouvements
                  const dialogRefConfirm = this.dialog.open(ImportConfirmComponent, {
                    data: {
                      type: "mouvements",
                      imports: mouvementsToImport
                    }
                  });

                  dialogRefConfirm.afterClosed().subscribe((result:any) => {
                    //If user has choosed to import
                    if(result){
                      //User confirm importation thus import
                      var nbImporte: number = 0;
                      this.lastMouvements = [];
                      mouvementsToImport.forEach((tmpMouvement:Mouvement) => {
                        this.documentService.document.mouvements.push(tmpMouvement);
                        nbImporte++;
                        this.lastMouvements.push(tmpMouvement);
                      });

                      this.alertService.success(nbImporte + ' mouvements ont été importés avec succès !');

                    }else{
                      this.alertService.error("Importation annulée : l'importation n'est pas confirmée !");
                    }
                  });
                }else{
                  this.alertService.error("Importation impossible : aucun mouvement valide à importer !");
                }
              }else{
                this.alertService.error("Importation impossible : il manque l'entête ou aucune donnée à importer !");
              }
            }else{
              this.alertService.error("Importation impossible : ordre ou type des colonnes non conforme (attendu : Date;Bien;Libellé;Montant;Tiers;Commentaires) !");
            }
          }else{
            this.alertService.error('Importation impossible : le format d\'import n\'est pas respecté (6 colonnes requises) !');
          }
        }
      }else{
        //User cancel importation
        this.alertService.error('Importation annulée : les mouvements n\'ont pas été importés !');
      }
    });
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