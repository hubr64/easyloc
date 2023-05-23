import { Component, OnInit, Input, ViewChild } from '@angular/core';
import { Location } from '@angular/common';

import { EChartsOption, SeriesOption } from 'echarts';
import 'echarts/theme/dark.js';

import { MatTable } from '@angular/material/table';
import { MatTableDataSource} from '@angular/material/table';

import { Mouvement } from '../_modeles/mouvement';
import { Bail } from '../_modeles/bail';
import { DocumentService } from '../_services/document.service';
import { ConfigurationService } from '../_services/configuration.service';

@Component({
  selector: 'app-statistiques-bails',
  templateUrl: './statistiques-bails.component.html',
  styleUrls: ['./statistiques-bails.component.scss']
})
export class StatistiquesBailsComponent implements OnInit{

  @Input() simple: boolean;
  @Input() bail: Bail;

  //The variable that store the raw data
  public bilanParAn: {
    [key: number]: {
        chargelocative: number,
        provisioncharge: number,
        regulcharge: number,
        chargepercue: number,
        nonrecuperable: number
      } 
  } = {};
  //Chart configuration options
  public chartOptionCharges: EChartsOption;

  // All table elements for charges
  public charges: {
    year: any,
    chargelocative: number,
    provisioncharge: number,
    regulcharge: number,
    chargepercue: number,
    nonrecuperable: number
  }[] = [];

  @ViewChild(MatTable) table!: MatTable<any>;
  public dataSource: MatTableDataSource<any>;
  public displayedColumns = ['year', 'chargepercue', 'chargelocative', 'provisioncharge', 'regulcharge', 'totalcharge', 'delta', 'nonrecuperable'];

  constructor(
    public documentService: DocumentService,
    public configurationService: ConfigurationService,
    private location: Location) { }

  ngOnInit(): void {

    this.getData();

    //If document is reloaded then reset back to be sure that everything will be recompute
    this.documentService.docIsLoadedChange.subscribe((isLoaded: boolean) => {
      if(isLoaded){
        this.getData();
      }
    });
  }

  public getData(){

    //FIrst init the first main object
    this.bilanParAn = {};

    //Get the current date to have an ended date
    var currentDate = new Date();

    //Init the main object at least witht the current year
    this.bilanParAn[currentDate.getFullYear()] = {chargelocative:0, provisioncharge: 0, regulcharge:0, chargepercue:0, nonrecuperable:0};

    //First analyse all mouvements to look for paied loyer or mouvement with locative charges
    this.documentService.document.mouvements.forEach( (mouvement:Mouvement) => {
      
      //We just compute for now and passed mouvement but not for future year
      if(mouvement.date.getFullYear() <= currentDate.getFullYear()){
        // If the main object for the mouvement year year still doesn't exist then create it
        if(!this.bilanParAn[mouvement.date.getFullYear()]){
          this.bilanParAn[mouvement.date.getFullYear()] = {chargelocative:0, provisioncharge: 0, regulcharge:0, chargepercue:0, nonrecuperable:0};
        }

        //If the mouvement is positive and if the description contains loyer then get the charge
        if(mouvement.montant>0 && mouvement.libelle.toLowerCase().indexOf("loyer") != -1 && mouvement.quittance){
          // The bail is detected if this is the same bien and if the mouvement date is inside the bail date
          if(mouvement.bien.id == this.bail.bien.id && 
            mouvement.date > this.bail.dateDebut &&
            (!this.bail.dateFin || mouvement.date < this.bail.dateFin)
          ){
            this.bilanParAn[mouvement.date.getFullYear()].chargepercue += this.bail.charges;
            }
        }
        //If the montant is negative and if this charge is a locative charge    
        if(mouvement.montant<0 && mouvement.libelle.toLowerCase().indexOf("charges locatives")!=-1 && mouvement.bien.id == this.bail.bien.id){
          this.bilanParAn[mouvement.date.getFullYear()].chargelocative += -mouvement.montant;
        }
        //If the montant is negative and if this charge is a provision charge    
        if(mouvement.montant<0 && mouvement.libelle.toLowerCase().indexOf("provision sur charges")!=-1 && mouvement.bien.id == this.bail.bien.id){
          this.bilanParAn[mouvement.date.getFullYear()].provisioncharge += -mouvement.montant;
        }
        //If the montant is negative and if this charge is a regularisation of charge    
        if(mouvement.montant<0 && mouvement.libelle.toLowerCase().indexOf("régularisation de charges")!=-1 && mouvement.bien.id == this.bail.bien.id){
          this.bilanParAn[mouvement.date.getFullYear()].regulcharge += -mouvement.montant;
        }
      }
    });

    //Clean all years with empty data (just display usefull information)
    for (let keyYear in this.bilanParAn) {
      if(this.bilanParAn[keyYear].chargepercue == 0){
        delete this.bilanParAn[keyYear];
      }else{
        let tauxPartLocataire: number = parseFloat(this.configurationService.getValue('impotChargesPartLocataire'));

        this.bilanParAn[keyYear].nonrecuperable = (this.bilanParAn[keyYear].provisioncharge + this.bilanParAn[keyYear].regulcharge) * (1 - tauxPartLocataire);
        this.charges.push({
          year:keyYear, 
          chargelocative: this.bilanParAn[keyYear].chargelocative, 
          provisioncharge: this.bilanParAn[keyYear].provisioncharge, 
          regulcharge: this.bilanParAn[keyYear].regulcharge, 
          chargepercue: this.bilanParAn[keyYear].chargepercue, 
          nonrecuperable:this.bilanParAn[keyYear].nonrecuperable
        });
      }
    }

    //Compute information for graphs
    this.computeChartOptionsForCharges();

    // Configure table
    this.dataSource = new MatTableDataSource(this.charges);
  }

  public computeChartOptionsForCharges(){

    var xAxisArray = [];
    var legend = [];
    var series: SeriesOption[] = [];

    for (let keyYear in this.bilanParAn) {
      xAxisArray.push(keyYear);
    }

    
    var chargepercueData = [];
    legend.push("Charges perçues");
    for (let keyYear in this.bilanParAn) {
      if(this.bilanParAn[keyYear]){
        chargepercueData.push(Math.round(this.bilanParAn[keyYear].chargepercue));
      }else{
        chargepercueData.push(0);
      }
    }
    series.push({
      name: "Charges perçues",
      color: '#91cc75',
      type: 'bar',
      stack: 'in',
      label: {
        show: true,
        formatter: '{c} €',
        position: 'insideTop'
      },
      barGap: 0,
      emphasis: {
        focus: 'series'
      },
      data: chargepercueData
    });

    var nonrecuperableData = [];
    legend.push("Non récupérables");
    for (let keyYear in this.bilanParAn) {
      if(this.bilanParAn[keyYear]){
        nonrecuperableData.push(Math.round(this.bilanParAn[keyYear].nonrecuperable));
      }else{
        nonrecuperableData.push(0);
      }
    }
    series.push({
      name: "Non récupérables",
      color: '#cccccc',
      type: 'bar',
      stack: 'in',
      label: {
        show: true,
        formatter: '{c} €',
        position: 'insideTop'
      },
      barGap: 0,
      emphasis: {
        focus: 'series'
      },
      data: nonrecuperableData
    });

    var chargelocativeData = [];
    legend.push("Charges locatives");
    for (let keyYear in this.bilanParAn) {
      if(this.bilanParAn[keyYear]){
        chargelocativeData.push(Math.round(this.bilanParAn[keyYear].chargelocative));
      }else{
        chargelocativeData.push(0);
      }
    }
    series.push({
      name: "Charges locatives",
      type: 'bar',
      stack: 'out',
      label: {
        show: true,
        formatter: '{c} €'
      },
      color: '#ff4444',
      barGap: 0,
      emphasis: {
        focus: 'series'
      },
      data: chargelocativeData
    });

    var provisionchargeData = [];
    legend.push("Provision sur charges");
    for (let keyYear in this.bilanParAn) {
      if(this.bilanParAn[keyYear]){
        provisionchargeData.push(Math.round(this.bilanParAn[keyYear].provisioncharge));
      }else{
        provisionchargeData.push(0);
      }
    }
    series.push({
      name: "Provision sur charges",
      type: 'bar',
      stack: 'out',
      label: {
        show: true,
        formatter: '{c} €'
      },
      color: '#ee0000',
      barGap: 0,
      emphasis: {
        focus: 'series'
      },
      data: provisionchargeData
    });

    var regulchargeData = [];
    legend.push("Régulation de charges");
    for (let keyYear in this.bilanParAn) {
      if(this.bilanParAn[keyYear]){
        regulchargeData.push(Math.round(this.bilanParAn[keyYear].regulcharge));
      }else{
        regulchargeData.push(0);
      }
    }
    series.push({
      name: "Régulation de charges",
      type: 'bar',
      stack: 'out',
      label: {
        show: true,
        formatter: '{c} €'
      },
      color: '#cc0000',
      barGap: 0,
      emphasis: {
        focus: 'series'
      },
      data: regulchargeData
    });
    


    this.chartOptionCharges = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      legend: {
        show: true,
        orient: 'horizontal',
        data: legend
      },
      toolbox: {
        show: true,
        orient: 'vertical',
        left: 'right',
        top: 'center',
        feature: {
          mark: { show: true },
          dataView: { show: true, readOnly: false },
          magicType: { show: true, type: ['line', 'bar', 'stack'] },
          restore: { show: true },
          saveAsImage: { show: true }
        }
      },
      dataZoom: {
        type: 'slider',
      },
      xAxis: {
        type: 'category',
        data: xAxisArray,
      },
      yAxis: {
        type: 'value',
        name: 'Mouvements',
        axisLabel: {
          formatter: '{value} €'
        }
      },
      series: series,
    };
  }

  goBack(): void {
    this.location.back();
  }

}
