import { AfterViewInit, Component, ViewChild, Inject, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { SelectionModel } from '@angular/cdk/collections';
import { FormControl } from '@angular/forms';

import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTable } from '@angular/material/table';
import { MatTableDataSource} from '@angular/material/table';
import { MatDialog} from '@angular/material/dialog';
import { MatBottomSheet} from '@angular/material/bottom-sheet';

import { AlertService } from '../_services/alert.service';
import { DriveService } from '../_services/drive.service';
import { DocumentService } from '../_services/document.service';
import { ExportCsvService }      from '../_services/export-csv.service';
import { Piece } from '../_modeles/piece';
import { PIECECODE as pieceCodes } from '../_modeles/piece';
import { DialogDeleteConfirmComponent } from '../dialog-delete-confirm/dialog-delete-confirm.component';
import { UploadComponent } from '../upload/upload.component';
import { PieceUsersComponent } from '../piece-users/piece-users.component';

@Component({
  selector: 'app-piece-liste',
  templateUrl: './piece-liste.component.html',
  styleUrls: ['./piece-liste.component.scss']
})
export class PieceListeComponent implements AfterViewInit  {

  // COmponent input and output
  @Input() embedded: boolean = false;
  @Output() selected = new EventEmitter<Piece[]>();
  
  private _defaultPieces: Piece[];
  @Input() 
  set defaultPieces(value: Piece[]) {
    //Get the new default list of pieces
    this._defaultPieces = value;
    // If a datasource is defined (not the case just at the beginning)
    if(this.dataSource){
      //Update list of data
      this.dataSource.data = this._defaultPieces;
      //Clear selection as new list has changed
      this.selection.clear();
    }
  }
  get defaultPieces(): Piece[] {
    return this._defaultPieces;
  }

  // All table elements
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatTable) table!: MatTable<Piece>;
  public dataSource: MatTableDataSource<Piece>;

  // Columns displayed in the table. Columns IDs can be added, removed, or reordered.
  public displayedColumns = ['select', 'id', 'nom', 'description', 'code', 'utilisation', 'actions'];
  public displayedColumnsEmbedded = ['select', 'nom', 'description', 'code'];
  //Multi selection management
  public initialSelection = [];
  public allowMultiSelect: boolean = true;
  public selection: SelectionModel<Piece> = new SelectionModel<Piece>(this.allowMultiSelect, this.initialSelection);
  // String to manage the search filter
  public typeFilter = new FormControl('');
  public searchFilter = new FormControl('');
  public filterValues: any = {
    type: '',
    search: ''
  }
  //URL for each piece
  public urlPieces: {[key: string]: string} = {};
  //404 error for each piece
  public errorPieces: {[key: string]: number} = {};
  //PIece which description is currenlty edited (sotre descr and code in temporary variable to edit value only when user validate)
  public currentEdited: Piece;
  public currentEditedDescription: string;
  public currentEditedCode: string;
  //Conversion between codes and text of codes
  public codes = pieceCodes;

  constructor(
    public alertService: AlertService,
    public driveService: DriveService,
    public documentService: DocumentService,
    private exportCsvService: ExportCsvService,
    private router: Router,
    public dialog: MatDialog,
    private _bottomSheet: MatBottomSheet,
    private cdr: ChangeDetectorRef
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
    //Listen for filter change
    this.fieldListener();
  }

  private fieldListener() {
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
    this.dataSource = new MatTableDataSource(this.defaultPieces?this.defaultPieces:this.documentService.document.pieces);
    // Add sort and paginator
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
    //Add filter parameters
    this.dataSource.filterPredicate = this.createFilter();
    this.dataSource.filter = JSON.stringify(this.filterValues);
    //Configure multi selection
    this.selection = new SelectionModel<Piece>(this.allowMultiSelect, this.initialSelection);
    this.selection.changed.subscribe(()=>{
      this.selected.emit(this.selection.selected);
    })

    this.documentService.document.pieces.forEach((piece:Piece) => {
      this.driveService.get(piece.id).then( 
        (response: any) => {
          this.urlPieces[piece.id] = response.result.webContentLink;
          this.cdr.detectChanges();
        },
        (error:any) => {
          if(error.status==404){
            this.errorPieces[piece.id] = error.status;
            this.cdr.detectChanges();
          }
          console.error("Impossible to get metadata for " + piece.nom);
        }
      );
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
        this.dataSource.data.forEach(row => this.selection.select(row));
  }

  private createFilter(): (piece: Piece, filter: string) => boolean {
    let filterFunction = function (piece: Piece, filter: string): boolean {
      let searchTerms = JSON.parse(filter);
      return (searchTerms.type.length==0 || (searchTerms.type.length>0 && piece.code.indexOf(searchTerms.type) !== -1) )
        && JSON.stringify(piece.toJSON()).toLowerCase().indexOf(searchTerms.search.toLowerCase()) !== -1;
    }
    return filterFunction;
  }

  clearFilter(){
    this.searchFilter.setValue('');
    this.typeFilter.setValue('');
  }

  edit(piece: Piece): void {
    //Set current edited to current piece
    this.currentEdited = piece;
    this.currentEditedDescription = piece.description;
    this.currentEditedCode = piece.code;
  }
  save(piece: Piece, event: any = undefined): void {
    // Prevent to edit the piece after deletion
    if(event){
      event.stopPropagation();
    }
    //STore new value in the edited piece
    piece.description = this.currentEditedDescription;
    piece.code = this.currentEditedCode;
    //Replace current edited by a fake piece
    this.currentEdited = new Piece();
    this.currentEditedDescription = "";
    this.currentEditedCode = "";
  }

  delete(piece: Piece, event: any = undefined): void {
    // Prevent to edit the piece after deletion
    if(event){
        event.stopPropagation();
    }

    //Display a confirmation dialog
    const dialogRef = this.dialog.open(DialogDeleteConfirmComponent, {
      data: {
        type: "ce document",
        value: piece.nom + ' (' + (this.errorPieces[piece.id]==404?"Attention ! Ce document ne semble plus exister dans le drive ! Sa suppression ne se fera que dans Easyloc.":piece.description) + ')',
      },
    });

    dialogRef.afterClosed().subscribe((result:boolean) => {
      //If user confirme deletion
      if(result){
        //Remove the file from the drive
        this.driveService.deleteFileInDocumentFolder(piece.id).subscribe(
          (response:any) => {
            //Remove the file in the global document 
            this.documentService.removePieceInDocument(piece);
            // Update data source
            this.dataSource.data = this.documentService.document.pieces;
            // Display confirmation
            this.alertService.success('La suppression a été réalisée.');
          },
          (error:any) => {
            //The file does not exist on drive so remove it in the document only
            if(error.status==404){
              //Remove the file in the global document 
              this.documentService.removePieceInDocument(piece);
              // Update data source
              this.dataSource.data = this.documentService.document.pieces;
              // Display confirmation
              this.alertService.success('La suppression a été réalisée.');
            //An other error occurs the display it
            }else{
              this.alertService.error("Impossible de supprimer le fichier : " + error.message + "(Erreur "+ error.status +")");
            }
          });
      // If user finally change his mind
      }else{
        this.alertService.error('La suppression a été annulée...');
      }
    });

  }

  deleteAll(): void {
    var bailleursMail: string[] = [];
    for (let item of this.selection.selected) {
      this.delete(item);
    }
  }

  add(): void {
    //Display a confirmation dialog
    const dialogRef = this.dialog.open(UploadComponent, {
      data: {
        multiple: true
      }
    });

    dialogRef.afterClosed().subscribe((result:any) => {
      //If user has choosed a file
      if(result){
        if(result.length>0){
          result.forEach((fichier:any) => {
            let tmpPiece = new Piece();
            tmpPiece.id = fichier.fileId;
            tmpPiece.nom = fichier.name;
            tmpPiece.code = fichier.code;
            tmpPiece.description = fichier.name.split('.').slice(0, -1).join('.');
            this.documentService.document.pieces.push(tmpPiece);
          });
        }
        // Update data source
        this.dataSource.data = this.documentService.document.pieces;
        this.alertService.success('Les fichiers ont bien été ajoutés...');
      }else{
        this.alertService.error('Aucun fichier à ajouter...');
      }
    });
  }

  public export(): void {
    // If there is at least one piece to export
    if(this.documentService.document.pieces.length > 0)
    {
      //Create an array to temporaly store the export data
      var jsonToCsv = [];
      // Browse all pieces (as this is not limited to selection)
      for (let piece of this.documentService.document.pieces) {
        jsonToCsv.push({
          'Id':piece.id,
          "Nom":piece.nom,
          "Description":piece.description,
          "Code":pieceCodes[piece.code],
          "URL":this.urlPieces[piece.id]
        });
      }
      // Use export service to automaticaly lauch the download process
      this.exportCsvService.downloadFile(JSON.stringify(jsonToCsv),"pieces");
    }else{
      this.alertService.error("Exportation impossible car il n'y a aucune pièce dans la liste.");
    }
  }

  public openUtilisations(piece: Piece){
    const pieceUsers = this.documentService.getPieceUsage(piece);
    this._bottomSheet.open(PieceUsersComponent, {
      data: {
        users: pieceUsers,
        piece: piece,
        canRemove: true
      }
    });
  }

  public compareCodes(a: any, b: any){
    return (a.value < b.value ? -1 : a.value > b.value ? 1 : 0)
  }

}
