import { Component, OnInit, Inject, ViewChild } from '@angular/core';

import { EChartsOption, SeriesOption } from 'echarts';
import { MatTable } from '@angular/material/table';
import { MatSort, Sort } from '@angular/material/sort';
import { MatTableDataSource} from '@angular/material/table';
import { MatDialog, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { AlertService } from '../_services/alert.service';
import { DocumentService } from '../_services/document.service';
import { ConfigurationService } from '../_services/configuration.service';
import { Compteur, CompteurValue } from '../_modeles/compteur';
import { Piece } from '../_modeles/piece';
import { DialogDeleteConfirmComponent } from '../dialog-delete-confirm/dialog-delete-confirm.component';
import { CompteurValueDetailsComponent } from '../compteur-value-details/compteur-value-details.component';

@Component({
  selector: 'app-compteur-value-fiche',
  templateUrl: './compteur-value-fiche.component.html',
  styleUrls: ['./compteur-value-fiche.component.scss']
})
export class CompteurValueFicheComponent implements OnInit {

  public compteur: Compteur;

  //Compteur value table
  @ViewChild(MatTable) table!: MatTable<CompteurValue>;
  @ViewChild(MatSort) sort: MatSort;
  public dataSource: MatTableDataSource<CompteurValue>;

  // Columns displayed in the table. Columns IDs can be added, removed, or reordered.
  public displayedColumns = ['dateReleve', 'valeur', 'preuve', 'actions'];

  public chartOptions: EChartsOption;

  constructor(
    public alertService: AlertService,
    public documentService: DocumentService,
    public configurationService: ConfigurationService,
    public dialog: MatDialog,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  ngOnInit(): void {

    this.compteur = this.data.compteur;

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
  }

  getData(): void {
    //Create datasource from data
    this.dataSource = new MatTableDataSource(this.compteur.valeurs);
    // Add sort
    this.dataSource.sort = this.sort;
    // Manage values to prepare charting them
    var tmpValues = this.prepareValuesToGraph();
    this.computeChartOptions(tmpValues);

  }

  private prepareValuesToGraph(): CompteurValue[] {

    //Browse all values, make a deep copy and convert value to float if possible
    var tmp: CompteurValue[] = [];
    this.compteur.valeurs.forEach((valeur: CompteurValue) => {
      var tmpCompteurValue = CompteurValue.fromJSON(valeur.toJSON());
      tmpCompteurValue.valeur = parseFloat(tmpCompteurValue.valeur);
      //If the value is a float that can be graph
      if(tmpCompteurValue.valeur){
        tmp.push(tmpCompteurValue);
      }
    });
    //Sort all values by date
    tmp.sort(this.compareCompteurValue);

    return tmp;
  }

  private computeChartOptions(compteurValues: CompteurValue[]){
    
    //Do not dispay chart just for one point !
    if(compteurValues.length>1){
      var seriesData: SeriesOption[] = [];

      //Convert values to display them in the chart
      var valeursData: any[] = [];
      compteurValues.forEach((valeur: CompteurValue) => {
        valeursData.push([valeur.dateReleve.toISOString(), Math.round(valeur.valeur)]);
      });
      
      //Compute year consumption
      var valeursDataForYear: any[] = [];
      compteurValues.forEach((valeur: CompteurValue) => {
        //First get date for last year  
        var lastYearDate = new Date (valeur.dateReleve.getTime())
        lastYearDate.setFullYear(lastYearDate.getFullYear() - 1);

        var beforeDiffTime = valeur.dateReleve.getTime();
        var beforeValue: any = null;
        var afterDiffTime = valeur.dateReleve.getTime();
        var afterValue: any = null;

        //Try to find the releve just before and just after that date
        compteurValues.forEach((valeurTmp: CompteurValue) => {
          if(valeurTmp.dateReleve < lastYearDate){
            var diffTime = lastYearDate.getTime() - valeurTmp.dateReleve.getTime();
            if(diffTime < beforeDiffTime){
              beforeDiffTime = diffTime;
              beforeValue = valeurTmp;
            }
          }else{
            var diffTime = valeurTmp.dateReleve.getTime() - lastYearDate.getTime();
            if(diffTime < afterDiffTime){
              afterDiffTime = diffTime;
              afterValue = valeurTmp;
            }
          }
        });
        
        //Compute a linear interpolated value based on releve before and after prviously identified
        var interpolatedValue: number = 0;
        //If we found before and after then just have to define (a,b) of y=ax+b and interpolate
        if(beforeValue && afterValue){
          var a = (afterValue.valeur - beforeValue.valeur)/(afterValue.dateReleve.getTime() - beforeValue.dateReleve.getTime());
          var b = beforeValue.valeur-a*beforeValue.dateReleve.getTime();
          interpolatedValue = a * lastYearDate.getTime() + b;
        }else{
          //If we don't found anything before and if the value after is not the current value then we use the after value (simplification)
          if(!beforeValue && afterValue && afterValue.valeur!=valeur.valeur){
            interpolatedValue = afterValue.valeur;
          //Otherwise is it impossible to determine the choose to use 0
          }else{
            interpolatedValue = 0;
          } 
        }
        valeursDataForYear.push([valeur.dateReleve.toISOString(), Math.round(valeur.valeur-interpolatedValue)]);
      });

      seriesData.push({
        name: "Evolution de l'index",
        type: 'line',
        smooth: true,
        label: {
          show: true,
          color: 'inherit'
        },
        data: valeursData
      });
      seriesData.push({
        name: "Consommation annuelle",
        type: 'bar',
        label: {
          show: true,
          formatter: '{@[1]} '+ this.compteur.unite,
          position: 'insideTop'
        },
        data: valeursDataForYear
      });

      this.chartOptions = {
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow'
          }
        },
        legend: {
          show: true
        },
        toolbox: {
          show: false
        },
        xAxis: {
          type: 'time',
          axisLabel: {
            rotate: 45,
            formatter: '{dd}/{MM}/{yy}'
          }
        },
        yAxis: {
          type: 'value',
        },
        series: seriesData,
      };
    }
  }

  private compareCompteurValue(a: CompteurValue, b: CompteurValue ) {
    if ( a.dateReleve < b.dateReleve ){
      return -1;
    }
    if ( a.dateReleve > b.dateReleve ){
      return 1;
    }
    return 0;
  }

  edit(compteurValue: CompteurValue): void {
    //Display a confirmation dialog
    const dialogRef = this.dialog.open(CompteurValueDetailsComponent, {
      data: {
        chooseCompteur: false,
        compteurValue: compteurValue
      },
    });

    dialogRef.afterClosed().subscribe((result:any) => {
      //If user confirm update
      if(result){
        compteurValue.dateReleve = result.dateReleve;
        compteurValue.valeur = result.valeur;
        compteurValue.commentaires = result.commentaires;
        this.documentService.document.pieces.forEach((docPiece:Piece) => {
          if(docPiece.id == result.preuve){
            compteurValue.preuve = docPiece;
          }
        });
        // Update data source and graph
        this.getData();
      // If user finally change his mind
      }else{
        this.alertService.error('La modification a été annulée...');
      }
    });
  }

  delete(compteurValue: CompteurValue): void {
    //Display a confirmation dialog
    const dialogRef = this.dialog.open(DialogDeleteConfirmComponent, {
      data: {
        type: "ce relevé",
        value: compteurValue.toString(),
      },
    });

    dialogRef.afterClosed().subscribe((result:boolean) => {
      //If user confirm deletion
      if(result){
        //Remove in the global definition
        const index = this.compteur.valeurs.indexOf(compteurValue, 0);
        if (index > -1) {
          this.compteur.valeurs.splice(index, 1);
        }
        // Update data source
        this.dataSource.data = this.compteur.valeurs;
      // If user finally change his mind
      }else{
        this.alertService.error('La suppression a été annulée...');
      }
    });

  }

  public addValeur(){
    //Display a selection dialog
    const dialogRef = this.dialog.open(CompteurValueDetailsComponent, {
      data: {
        chooseCompteur: false,
        compteur: this.compteur
      }
    });
    //Manage dialog result
    dialogRef.afterClosed().subscribe((result:any) => {
      //If user confirm add
      if(result){
        //Add in the global definition
        let tmpNew: CompteurValue = CompteurValue.fromJSON(result, this.documentService.document.pieces);
        this.compteur.valeurs.push(tmpNew);
        this.alertService.success('La nouvelle valeur de compteur est maintenant ajoutée.');
        // Update data source and graph
        this.getData();
      // If user finally change his mind
      }else{
        this.alertService.error("L'ajout d'une valeur a été annulée...");
      }
    });
  }

  public displayValeurs(compteur: Compteur){
    //Display a selection dialog
    const dialogRef = this.dialog.open(CompteurValueFicheComponent, {
      autoFocus: false,
      data: {
        compteur: compteur
      }
    });
  }

}
