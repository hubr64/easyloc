import { Component, OnInit, Input, ViewChild, ElementRef } from '@angular/core';
import { Location } from '@angular/common';

import { EChartsOption, SeriesOption } from 'echarts';
import 'echarts/theme/dark.js';

import { Bien } from '../_modeles/bien';
import { Mouvement } from '../_modeles/mouvement';
import { Bail } from '../_modeles/bail';
import { AlertService } from '../_services/alert.service';
import { DocumentService } from '../_services/document.service';
import { ConfigurationService } from '../_services/configuration.service';

@Component({
  selector: 'app-statistiques-details',
  templateUrl: './statistiques-details.component.html',
  styleUrls: ['./statistiques-details.component.scss']
})
export class StatistiquesDetailsComponent implements OnInit {

  //Input and output of the components
  @Input() defaultBien: Bien;
  @Input() simple: boolean;

  //The variable that store the raw data
  public bilanParAn: {
    [key: string]: {
      [key: number]: {
        in: number, 
        out: number,
        gains: number,
        gainsCumules: number,
        revenuMensuel: number,
        rentability: number,
        loyer: number,
        locationRate: number,
      } 
    }
   } = {};

   public bilan: {
    [key: string]: {
      in: number, 
      out: number,
      gains: number,
      revenuMensuel: number,
      rentability: number,
      loyer: number,
      locationRate: number,
    }
   } = {};


  public chartOptionGlobaRentability: EChartsOption;
  public chartOptionBienRentability: EChartsOption;
  public chartOptionGains: EChartsOption;
  public chartOptionLoyers: EChartsOption;
  public chartOptionTaux: EChartsOption;

  @ViewChild('chartSimple') chartSimple: ElementRef;
  public chartOptionSimple: EChartsOption;
  public chartOptionSimpleBien: EChartsOption;
  public chartOptionSimpleLoyers: EChartsOption;

  public currentYear: number = new Date().getFullYear();

  constructor(
    private alertService: AlertService,
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

    //FIrst init everything
    this.bilanParAn = {};
    this.bilan = {};

    //Get the current date to have an ended date
    var currentDate = new Date();

    //Build the global object that compute totals
    this.bilanParAn["total"] = {};
    this.bilanParAn["total"][currentDate.getFullYear()] = {in:0, out:0, gains: 0, gainsCumules:0, revenuMensuel:0, rentability:0, loyer:0, locationRate: 0};

    //We first begin to fill with all biens and we add at least a value for current yeat
    this.documentService.document.biens.forEach( (bien:Bien) => {
      if(!this.bilanParAn[bien.nom]){
        this.bilanParAn[bien.nom] = {};
      }
      this.bilanParAn[bien.nom][currentDate.getFullYear()] = {in:0, out:0, gains: 0, gainsCumules:0, revenuMensuel:0, rentability:0, loyer:0, locationRate: 0};
    });

    //First analyse all mouvements to get in and outs for each bien and for each year
    this.documentService.document.mouvements.forEach( (mouvement:Mouvement) => {
      //We just compute for now and passed mouvement but not for future year
      if(mouvement.date.getFullYear() <= currentDate.getFullYear()){
        // If the object for this bien for this year still doesn't exist then create it
        if(!this.bilanParAn[mouvement.bien.nom][mouvement.date.getFullYear()]){
          this.bilanParAn[mouvement.bien.nom][mouvement.date.getFullYear()] = {in:0, out:0, gains: 0, gainsCumules:0, revenuMensuel:0, rentability:0, loyer:0, locationRate: 0};
        }
        // If the object for the total for this year still doesn't exist then create it
        if(!this.bilanParAn["total"][mouvement.date.getFullYear()]){
          this.bilanParAn["total"][mouvement.date.getFullYear()] = {in:0, out:0, gains: 0, gainsCumules:0, revenuMensuel:0, rentability:0, loyer:0, locationRate: 0};
        }
        //If this in an IN then add it to the in (in is positive)
        if(mouvement.montant>0){
          this.bilanParAn[mouvement.bien.nom][mouvement.date.getFullYear()].in += mouvement.montant;
          this.bilanParAn["total"][mouvement.date.getFullYear()].in += mouvement.montant;
        //If this in an OUT then add it to the out (out is negative)
        }else{
          this.bilanParAn[mouvement.bien.nom][mouvement.date.getFullYear()].out += mouvement.montant;
          this.bilanParAn["total"][mouvement.date.getFullYear()].out += mouvement.montant;
        }
      }
    });

    //Now that all in and out are get, compute gains, cumulated gains and mensual revenue 
    //For each bien and for total
    for (let keyBien in this.bilanParAn) {
      var gainsCumules: number = 0;
      for (let keyYear in this.bilanParAn[keyBien]) {
        //Gain is just the difference between in and out (as out are negative we make the sum)
        this.bilanParAn[keyBien][keyYear].gains = this.bilanParAn[keyBien][keyYear].in + this.bilanParAn[keyBien][keyYear].out;
        //The revenue is the gain of the year per month (simplified calcul to be more smoothed)
        if(parseInt(keyYear) !== currentDate.getFullYear()){
          this.bilanParAn[keyBien][keyYear].revenuMensuel = this.bilanParAn[keyBien][keyYear].gains / 12;
        }else{
          //When this is the current year we compute only for the elapsed months only (not 12 months that will underevaluate the result...)
          this.bilanParAn[keyBien][keyYear].revenuMensuel = this.bilanParAn[keyBien][keyYear].gains / (currentDate.getMonth()+1);
        }
        //The cumulated is the gain more the previsous computed gain (this is OK as the key are looped by number thus by incresing year)
        this.bilanParAn[keyBien][keyYear].gainsCumules = this.bilanParAn[keyBien][keyYear].in + this.bilanParAn[keyBien][keyYear].out + gainsCumules;
        //Keep cumulated gain for future years
        gainsCumules += this.bilanParAn[keyBien][keyYear].gains;
      }
    }
    //Now that gains are computed, compute the rentability (rentability is computed with bien cost that has to be defined)
    this.documentService.document.biens.forEach( (bien:Bien) => {
      //The bien cost is defined
      if(bien.prixAchat!=0){
        //The bien is defined in the variable (otherwise it means that the bien exist but no mouvement thus the bien is not exploited)
        if(this.bilanParAn[bien.nom]){
          //Compute rentability for each year
          for (let keyYear in this.bilanParAn[bien.nom]) {
            if(parseInt(keyYear) !== currentDate.getFullYear()){
              this.bilanParAn[bien.nom][keyYear].rentability = this.bilanParAn[bien.nom][keyYear].gains / bien.prixAchat;
            }else{
              //When this is the current year we extrapolate the year based on the elapsed month only (if don't do so, the curretn year will be underestimated)
              this.bilanParAn[bien.nom][keyYear].rentability = this.bilanParAn[bien.nom][keyYear].gains * (12 / (currentDate.getMonth()+1)) / bien.prixAchat; 
            }
          }
        }
      }
    });

    //Compute rentability for the total
    for (let keyYear in this.bilanParAn["total"]) {
      //Variable to store the cumulated bien cost (not bien are bought every year)
      var prixAchatBiensAll: number = 0;
      //Loop through all biens to get their buy date
      this.documentService.document.biens.forEach( (bien:Bien) => {
        //If the bien was bought the current computed year then add its cost to the cumulated cost
        if(bien.dateAchat.getFullYear() <= parseInt(keyYear)){
          if(this.bilanParAn[bien.nom][keyYear] && this.bilanParAn[bien.nom][keyYear].rentability!=0){
              prixAchatBiensAll += bien.prixAchat;
          }
        }
      });
      //Now that we know the bien cumulated cost can compute the rentability
      //Full year when this is previous years
      if(parseInt(keyYear) < currentDate.getFullYear()){
        this.bilanParAn["total"][keyYear].rentability = this.bilanParAn["total"][keyYear].gains / prixAchatBiensAll;
      }else{
        //When this is the current year we extrapolate the year based on the elapsed month only (if don't do so, the current year will be underestimated)
        if(parseInt(keyYear) == currentDate.getFullYear()){
          this.bilanParAn["total"][keyYear].rentability = this.bilanParAn["total"][keyYear].gains * (12 / (currentDate.getMonth()+1)) / prixAchatBiensAll;
        //If this is next year we can not compute then force to zero
        }else{
          this.bilanParAn["total"][keyYear].rentability = 0;
          
        }
      }
    }

    //Compute the average loyer for each bien for each year (total will be computed after)
    this.documentService.document.bails.forEach( (bail:Bail) => {
      // The the bien is already defined (otherwise means that a bail is defined but not exploited yet)
      if(this.bilanParAn[bail.bien.nom]){
        //Compute for each year
        for (let keyYear in this.bilanParAn[bail.bien.nom]) {
          // If the current computed year is inside the bail
          if(bail.dateDebut.getFullYear() <= parseInt(keyYear) && (!bail.dateFin || bail.dateFin.getFullYear() >= parseInt(keyYear) ) ){
            //If the loyer is already filled it means that there are more than one bail in the year then get the mean of the loyer
            if(this.bilanParAn[bail.bien.nom][keyYear].loyer != 0){
              this.bilanParAn[bail.bien.nom][keyYear].loyer = (this.bilanParAn[bail.bien.nom][keyYear].loyer + bail.loyer)/2;
            }else{
              this.bilanParAn[bail.bien.nom][keyYear].loyer = bail.loyer;
            }
          }
        }
      }
    });
    //Now compute the mean loyer by meaning all loyer of all bien for each year
    for (let keyYear in this.bilanParAn["total"]) {
      //To computhe the mean we use a temporarry array
      var loyers: number[] = [];
      for (let keyBien in this.bilanParAn) {
        if(keyBien!="total" && this.bilanParAn[keyBien][keyYear] && this.bilanParAn[keyBien][keyYear].loyer!=0){
          // Add the loyer to the temporary array
          loyers.push(this.bilanParAn[keyBien][keyYear].loyer);
        }
      }
      //The mean is the sum of array items divided by the length
      const sum = loyers.reduce((a, b) => a + b, 0);
      const avg = (sum / loyers.length) || 0;
      this.bilanParAn["total"][keyYear].loyer = avg;
    }

    
    //Look for each bien
    this.documentService.document.biens.forEach( (bien:Bien) => {
      //If the bien is exploited
      if(this.bilanParAn[bien.nom]){
        //For each year of this bien let's make the computation
        for (let keyYear in this.bilanParAn[bien.nom]) {
          //Two vars to count nb of month located...
          var monthLocation : number = 0;
          //...and number of month should be rented
          var nbLocation: number = 0;
          //Browse twelve months of a year
          for (let i = 0; i < 12; i++) {
            var tmpDate = new Date(parseInt(keyYear), i, 1, 0, 0, 0, 0);
            //If the lloking month is after bien buy date and before today
            if(bien.dateAchat<= tmpDate && tmpDate <= currentDate){   
              //Bien should be rented
              nbLocation++;
              //By default not rented unless if we found a bail
              var foundLocation = false;
              //Browse all bails to llok for a location at this month
              this.documentService.document.bails.forEach( (bail:Bail) => {
                //Look the bail only for this bien
                if(bail.bien == bien){
                  //If the bail covers the looking month then has found a location
                  if(bail.dateDebut <= tmpDate && (!bail.dateFin || bail.dateFin >= tmpDate ) ){
                    foundLocation = true;
                  }
                }
              });
              //If a location is found thus add it to the month located
              if(foundLocation){
                monthLocation++;
              }
            }
          }
          //The location rate is the number of month located over the number of month should be locate
          this.bilanParAn[bien.nom][keyYear].locationRate = monthLocation/nbLocation;
        }
      }
    });
    //Now compute the mean location rate
    for (let keyYear in this.bilanParAn["total"]) {
      //To computhe the mean we use a temporarry array
      var locationRates: number[] = [];
      for (let keyBien in this.bilanParAn) {
        if(keyBien!="total" && this.bilanParAn[keyBien][keyYear]){
          // Add the loyer to the temporary array
          locationRates.push(this.bilanParAn[keyBien][keyYear].locationRate);
        }
      }
      //The mean is the sum of array items divided by the length
      const sum = locationRates.reduce((a, b) => a + b, 0);
      const avg = (sum / locationRates.length) || 0;
      this.bilanParAn["total"][keyYear].locationRate = avg;
    }

    //Now finalise the computation by meaning all values together without years
    for (let keyBien in this.bilanParAn) {
      this.bilan[keyBien] = {in:0, out:0, gains: 0, revenuMensuel:0, rentability:0, loyer:0, locationRate: 0};

      var ins: number[] = []; 
      var outs: number[] = []; 
      var gains: number[] = []; 
      var revenuMensuels: number[] = []; 
      var rentabilities: number[] = []; 
      var loyers: number[] = []; 
      var locationRates: number[] = [];
      
      for (let keyYear in this.bilanParAn[keyBien]) {
        ins.push(this.bilanParAn[keyBien][keyYear].in);
        outs.push(this.bilanParAn[keyBien][keyYear].out);
        gains.push(this.bilanParAn[keyBien][keyYear].gains);
        revenuMensuels.push(this.bilanParAn[keyBien][keyYear].revenuMensuel);
        rentabilities.push(this.bilanParAn[keyBien][keyYear].rentability);
        loyers.push(this.bilanParAn[keyBien][keyYear].loyer);
        locationRates.push(this.bilanParAn[keyBien][keyYear].locationRate);
      }

      this.bilan[keyBien].in = ins.reduce((a, b) => a + b, 0);
      this.bilan[keyBien].out = outs.reduce((a, b) => a + b, 0);
      this.bilan[keyBien].gains = gains.reduce((a, b) => a + b, 0);
      var sum = revenuMensuels.reduce((a, b) => a + b, 0);
      this.bilan[keyBien].revenuMensuel = (sum / revenuMensuels.length) || 0;
      var sum = rentabilities.reduce((a, b) => a + b, 0);
      this.bilan[keyBien].rentability = (sum / rentabilities.length) || 0;
      var sum = loyers.reduce((a, b) => a + b, 0);
      this.bilan[keyBien].loyer = (sum / loyers.length) || 0;
      var sum = locationRates.reduce((a, b) => a + b, 0);
      this.bilan[keyBien].locationRate = (sum / locationRates.length) || 0;
    }

    if(!this.simple){
      this.computeChartOptionsForGlobalRentability();
      this.computeChartOptionsForBienRentability();
      this.computeChartOptionsForGains();
      this.computeChartOptionsForLoyers();
      this.computeChartOptionsForTaux();
    }else{
      this.computeChartOptionsForSimple();
      if(this.defaultBien){
        this.computeChartOptionsForLoyers();
        this.computeChartOptionsForSimpleBien();
      }
    }
  }

  public computeChartOptionsForGlobalRentability(){

    var elementToDisplay = "total";
    if(this.defaultBien && this.bilanParAn[this.defaultBien.nom]){
      elementToDisplay = this.defaultBien.nom;
    }

    var xAxisArray = [];
    var legend = [];
    var series: SeriesOption[] = [];

    for (let keyYear in this.bilanParAn[elementToDisplay]) {
      xAxisArray.push(keyYear);
    }

    var inData = [];
    legend.push("Entrées");
    for (let keyYear in this.bilanParAn[elementToDisplay]) {
      if(this.bilanParAn[elementToDisplay][keyYear]){
        inData.push(Math.round(this.bilanParAn[elementToDisplay][keyYear].in));
      }else{
        inData.push(0);
      }
    }
    series.push({
      name: "Entrées",
      type: 'bar',
      label: {
        show: true,
        formatter: '{c} €',
        position: 'insideTop'
      },
      color: '#91cc75',
      barGap: 0,
      emphasis: {
        focus: 'series'
      },
      data: inData
    });
    
    var outData = [];
    legend.push("Sorties");
    for (let keyYear in this.bilanParAn[elementToDisplay]) {
      if(this.bilanParAn[elementToDisplay][keyYear]){
        outData.push(Math.round(-this.bilanParAn[elementToDisplay][keyYear].out));
      }else{
        outData.push(0);
      }
    }
    series.push({
      name: "Sorties",
      color: '#ee6666',
      type: 'bar',
      label: {
        show: true,
        formatter: '{c} €',
        position: 'insideTop'
      },
      barGap: 0,
      emphasis: {
        focus: 'series'
      },
      data: outData
    });

    var rentabilityData = [];
    legend.push("Rentabilité");
    for (let keyYear in this.bilanParAn[elementToDisplay]) {
      if(this.bilanParAn[elementToDisplay][keyYear]){
        rentabilityData.push(this.bilanParAn[elementToDisplay][keyYear].rentability*100);
      }else{
        rentabilityData.push(0);
      }
    }
    series.push({
      name: "Rentabilité",
      color: '#5470c6',
      type: 'line',
      label: {
        show: true,
        color: 'inherit',
        formatter: '{c} %'
      },
      smooth: true,
      yAxisIndex: 1,
      data: rentabilityData.map(item => item.toFixed(2))
    });

    //if we display just for a specific bien then we also add the total to have a comparison
    var rentabilityDataTotal = [];
    if(elementToDisplay != 'total'){
      legend.push("Rentabilité moyenne");
      for (let keyYear in this.bilanParAn[elementToDisplay]) {
        if(this.bilanParAn["total"][keyYear]){
          rentabilityDataTotal.push(this.bilanParAn["total"][keyYear].rentability*100);
        }else{
          rentabilityDataTotal.push(0);
        }
      }
      series.push({
        name: "Rentabilité moyenne",
        type: 'line',
        smooth: true,
        label: {
          show: true,
          color: 'inherit',
          formatter: '{c} %'
        },
        color: '#73c0de',
        yAxisIndex: 1,
        data: rentabilityDataTotal.map(item => item.toFixed(2))
      });
    }

    this.chartOptionGlobaRentability = {
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
      yAxis: [{
        type: 'value',
        name: 'Entrées/Sorties',
        axisLabel: {
          formatter: '{value} €'
        }
      },
      {
        type: 'value',
        name: 'Rentabilité (en %)',
        axisLine: {
          onZero: false
        },
        splitLine: {
          show: false
        }
      }],
      series: series,
    };
  }

  public computeChartOptionsForBienRentability(){

    var xAxisArray = [];
    for (let keyYear in this.bilanParAn["total"]) {
      xAxisArray.push(keyYear);
    }

    var seriesData: SeriesOption[] = [];
    var legend = [];

    for (let keyBien in this.bilanParAn) {
      if(keyBien!="total"){
        legend.push(keyBien);
        var bienData = [];
        for (let keyYear in this.bilanParAn["total"]) {
          if(this.bilanParAn[keyBien][keyYear]){
            bienData.push(this.bilanParAn[keyBien][keyYear].rentability*100);
          }else{
            bienData.push(0);
          }
        }
        seriesData.push({
          name: keyBien,
          type: 'line',
          label: {
            show: true,
            color: 'inherit',
            formatter: '{c} %'
          },
          data: bienData.map(item => item?item.toFixed(2):'-')
        });
      }
    }

    var rentabilityDataTotal = [];
    legend.push("Rentabilité moyenne");
    for (let keyYear in this.bilanParAn["total"]) {
      if(this.bilanParAn["total"][keyYear]){
        rentabilityDataTotal.push(this.bilanParAn["total"][keyYear].rentability*100);
      }else{
        rentabilityDataTotal.push(0);
      }
    }
    seriesData.push({
      name: "Rentabilité moyenne",
      type: 'line',
      label: {
        show: true,
        color: 'inherit',
        formatter: '{c} %'
      },
      color: '#73c0de',
      smooth: true,
      data: rentabilityDataTotal.map(item => item.toFixed(2))
    });

    this.chartOptionBienRentability = {
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
        name: 'Rentabilité',
        axisLabel: {
          formatter: '{value} %'
        }
      },
      series: seriesData,
    };

  }

  public computeChartOptionsForGains(){

    var elementToDisplay = "total";
    if(this.defaultBien && this.bilanParAn[this.defaultBien.nom]){
      elementToDisplay = this.defaultBien.nom;
    }

    var xAxisArray = [];
    var legend = [];
    var series: SeriesOption[] = [];

    for (let keyYear in this.bilanParAn[elementToDisplay]) {
      xAxisArray.push(keyYear);
    }

    var gainsCumulesData = [];
    legend.push("Gains cumulés");
    for (let keyYear in this.bilanParAn[elementToDisplay]) {
      if(this.bilanParAn[elementToDisplay][keyYear]){
        gainsCumulesData.push(Math.round(this.bilanParAn[elementToDisplay][keyYear].gainsCumules));
      }else{
        gainsCumulesData.push(0);
      }
    }
    series.push({
      name: "Gains cumulés",
      type: 'bar',
      label: {
        show: true,
        formatter: '{c} €',
        position: 'insideTop'
      },
      barGap: 0,
      emphasis: {
        focus: 'series'
      },
      data: gainsCumulesData
    });

    var gainsData = [];
    legend.push("Gains");
    for (let keyYear in this.bilanParAn[elementToDisplay]) {
      if(this.bilanParAn[elementToDisplay][keyYear]){
        gainsData.push(Math.round(this.bilanParAn[elementToDisplay][keyYear].gains));
      }else{
        gainsData.push(0);
      }
    }
    series.push({
      name: "Gains",
      type: 'bar',
      label: {
        show: true,
        formatter: '{c} €',
        position: 'insideTop'
      },
      barGap: 0,
      emphasis: {
        focus: 'series'
      },
      data: gainsData
    });

    var revenusData = [];
    legend.push("Revenus nets par mois");
    for (let keyYear in this.bilanParAn[elementToDisplay]) {
      if(this.bilanParAn[elementToDisplay][keyYear]){
        revenusData.push(Math.round(this.bilanParAn[elementToDisplay][keyYear].revenuMensuel));
      }else{
        revenusData.push(0);
      }
    }
    series.push({
      name: "Revenus nets par mois",
      type: 'line',
      label: {
        show: true,
        color: 'inherit',
        formatter: '{c} €/mois'
      },
      smooth: true,
      yAxisIndex: 1,
      data: revenusData
    });

    //if we display just for a specific bien then we also add the total to have a comparison
    var revenusDataTotal: any[] = [];
    if(elementToDisplay != 'total'){
      legend.push("Revenus nets par mois moyens");
      for (let keyYear in this.bilanParAn[elementToDisplay]) {
        if(this.bilanParAn["total"][keyYear]){
          revenusDataTotal.push(Math.round(this.bilanParAn["total"][keyYear].revenuMensuel));
        }else{
          revenusDataTotal.push(0);
        }
      }
      series.push({
        name: "Revenus nets moyens par mois",
        type: 'line',
        smooth: true,
        label: {
          show: true,
          color: 'inherit',
          formatter: '{c} €/mois'
        },
        color: '#73c0de',
        yAxisIndex: 1,
        data: revenusDataTotal
      });
    }

    this.chartOptionGains = {
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
      yAxis: [{
        type: 'value',
        name: 'Gains',
        axisLabel: {
          formatter: '{value} €'
        }
      },
      {
        type: 'value',
        name: 'Revenus nets par mois',
        axisLabel: {
          formatter: '{value} €'
        },
        splitLine: {
          show: false
        }
      }],
      series: series,
    };
  }

  public computeChartOptionsForLoyers(){

    var elementToDisplay = "total";
    if(this.defaultBien && this.bilanParAn[this.defaultBien.nom]){
      elementToDisplay = this.defaultBien.nom;
    }

    var xAxisArray = [];
    var seriesData: SeriesOption[] = [];
    var legend = [];

    for (let keyYear in this.bilanParAn[elementToDisplay]) {
      xAxisArray.push(keyYear);
    }

    if(elementToDisplay == "total"){
      for (let keyBien in this.bilanParAn) {
        if(keyBien!="total"){
          legend.push(keyBien);
          var bienData = [];
          for (let keyYear in this.bilanParAn["total"]) {
            if(this.bilanParAn[keyBien][keyYear]){
              bienData.push(Math.round(this.bilanParAn[keyBien][keyYear].loyer));
            }else{
              bienData.push(0);
            }
          }
          seriesData.push({
            name: keyBien,
            type: 'bar',
            barGap: 0,
            emphasis: {
              focus: 'series'
            },
            data: bienData
          });
        }
      }
    }else{
      legend.push("Loyer du bien");
      var bienData = [];
      for (let keyYear in this.bilanParAn[elementToDisplay]) {
        if(this.bilanParAn[elementToDisplay][keyYear]){
          bienData.push(Math.round(this.bilanParAn[elementToDisplay][keyYear].loyer));
        }else{
          bienData.push('null');
        }
      }
      seriesData.push({
        name: "Loyer du bien",
        type: 'line',
        label: {
          show: true,
          color: 'inherit',
          formatter: '{c} €/mois'
        },
        data: bienData
      });
    }

    var loyerMeanData = [];
    for (let keyYear in this.bilanParAn["total"]) {
      if(this.bilanParAn["total"][keyYear] && this.bilanParAn[elementToDisplay][keyYear]){
        loyerMeanData.push(Math.round(this.bilanParAn["total"][keyYear].loyer));
      }
    }
    legend.push("Loyer moyen global");
    seriesData.push({
      name: "Loyer moyen global",
      type: 'line',
      smooth: true,
      label: {
        show: true,
        color: 'inherit',
        formatter: '{c} €/mois'
      },
      color: '#73c0de',
      data: loyerMeanData
    });


    this.chartOptionLoyers = {
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
        name: 'Loyer',
        min: 400,
        axisLabel: {
          formatter: '{value} €'
        }
      },
      series: seriesData,
    };

    this.chartOptionSimpleLoyers = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      legend: {
        show: true,
        orient: 'vertical',
        data: legend
      },
      toolbox: {
        show: false,
      },
      xAxis: {
        type: 'category',
        data: xAxisArray,
      },
      yAxis: {
        type: 'value',
        name: 'Loyer',
        min: function (value) {
          return 10*Math.floor((value.min - 20)/10);
        },
        axisLabel: {
          formatter: '{value} €'
        }
      },
      series: seriesData,
    };

  }

  public computeChartOptionsForTaux(){

    var elementToDisplay = "total";
    if(this.defaultBien && this.bilanParAn[this.defaultBien.nom]){
      elementToDisplay = this.defaultBien.nom;
    }

    var xAxisArray = [];
    var legend = [];
    var seriesData: SeriesOption[] = [];

    for (let keyYear in this.bilanParAn[elementToDisplay]) {
      xAxisArray.push(keyYear);
    }

    if(elementToDisplay == "total"){
      for (let keyBien in this.bilanParAn) {
        if(keyBien!="total"){
          legend.push(keyBien);
          var bienData = [];
          for (let keyYear in this.bilanParAn["total"]) {
            if(this.bilanParAn[keyBien][keyYear]){
              bienData.push(this.bilanParAn[keyBien][keyYear].locationRate*100);
            }else{
              bienData.push(0);
            }
          }
          seriesData.push({
            name: keyBien,
            type: 'bar',
            barGap: 0,
            emphasis: {
              focus: 'series'
            },
            data: bienData.map(item => item.toFixed(2))
          });
        }
      }
    }else{
      legend.push("Taux du bien");
      var bienData = [];
      for (let keyYear in this.bilanParAn[elementToDisplay]) {
        if(this.bilanParAn[elementToDisplay][keyYear]){
          bienData.push(this.bilanParAn[elementToDisplay][keyYear].locationRate*100);
        }else{
          bienData.push(0);
        }
      }
      seriesData.push({
        name: "Taux du bien",
        type: 'line',
        label: {
          show: true,
          color: 'inherit',
          formatter: '{c} %'
        },
        data: bienData.map(item => item.toFixed(2))
      });
    }

    var tauxMeanData = [];
    for (let keyYear in this.bilanParAn["total"]) {
      if(this.bilanParAn["total"][keyYear]){
        tauxMeanData.push(this.bilanParAn["total"][keyYear].locationRate*100);
      }else{
        tauxMeanData.push(0);
      }
    }
    legend.push("Taux moyen global");
    seriesData.push({
      name: "Taux moyen global",
      type: 'line',
      smooth: true,
      label: {
        show: true,
        color: 'inherit',
        formatter: '{c} %'
      },
      color: '#73c0de',
      data: tauxMeanData.map(item => item.toFixed(2))
    });


    this.chartOptionTaux = {
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
        name: 'Taux de location',
        min: 70,
        axisLabel: {
          formatter: '{value} %'
        }
      },
      series: seriesData,
    };

  }

  public computeChartOptionsForSimple(){

    var currentDate = new Date();
    var simpleSeries: SeriesOption[] = [];
    for (let keyBien in this.bilanParAn) {
      if(keyBien!="total"){
        simpleSeries.push({
          name: keyBien,
          type: 'bar',
          stack: 'total',
          label: {
            show: true,
            formatter: '{c} €',
          },
          emphasis: {
            focus: 'series'
          },
          data: [
            Math.round(this.bilanParAn[keyBien][currentDate.getFullYear()]?this.bilanParAn[keyBien][currentDate.getFullYear()].in:0),
            Math.round(this.bilanParAn[keyBien][currentDate.getFullYear()]?-this.bilanParAn[keyBien][currentDate.getFullYear()].out:0)
          ]
        });
      }
    }

    this.chartOptionSimple = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        },
      },
      grid:{
        top:10,
        bottom:10
      },
      legend: {
        show: false
      },
      xAxis: {
        type: 'value',
        show: false
      },
      yAxis: {
        type: 'category',
        data: ['Entrées', 'Sorties']
      },
      animationType: 'scale',
      series: simpleSeries,
      media: [ 
        {
            query: {maxWidth: 400},
            option: { 
              xAxis: {
                type: 'category',
                data: ['Entrées', 'Sorties']
              },
              yAxis: {
                type: 'value',
                show: false
              },
              grid:{
                bottom:20
              },
            }
        },{
          query: {minWidth: 400},
          option: {
            xAxis: {
              type: 'value',
              show: false
            },
            yAxis: {
              type: 'category',
              data: ['Entrées', 'Sorties']
            },
            grid:{
              top:10,
              bottom:10
            },
          }
      }
    ]
    };
  }

  public computeChartOptionsForSimpleBien(){

    var currentDate = new Date();

    var inOutData = [];
    inOutData.push({
      name: "Entrées",
      value: Math.round(this.bilanParAn[this.defaultBien.nom]?(this.bilanParAn[this.defaultBien.nom][currentDate.getFullYear()]?this.bilanParAn[this.defaultBien.nom][currentDate.getFullYear()].in:0):0)
    });
    inOutData.push({
      name: "Sorties",
      value: Math.round(this.bilanParAn[this.defaultBien.nom]?(this.bilanParAn[this.defaultBien.nom][currentDate.getFullYear()]?-this.bilanParAn[this.defaultBien.nom][currentDate.getFullYear()].out:0):0)
    });

    this.chartOptionSimpleBien = {
      title: [
        {
          subtext: ''+currentDate.getFullYear(),
          left: '50%',
          top: '42%',
          padding:0,
          textAlign: 'center',
          subtextStyle: {
            fontWeight: 700,
            fontSize: 16
          }
        }
      ],
      tooltip: {
        trigger: 'item'
      },
      series: [
        {
          type: 'pie',
          radius: [40, 70],
          color: ["#4caf50","#e53935"],
          height: 250,
          itemStyle: {
            borderRadius: 5,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: {
            alignTo: 'edge',
            formatter: '{name|{b}}\n{value|{c} €}',
            minMargin: 5,
            edgeDistance: 10,
            lineHeight: 15,
            textBorderColor :'transparent',
            color:'inherit',
            rich: {
              time: {
                fontSize: 10,
                color: '#999'
              }
            }
          },
          labelLine: {
            length: 15,
            length2: 0,
            maxSurfaceAngle: 80
          },
          labelLayout: (params: any) => {
            const isLeft = params.labelRect.x < this.chartSimple.nativeElement.width / 2;
            const points = params.labelLinePoints;
            // Update the end point.
            points[2][0] = isLeft
              ? params.labelRect.x
              : params.labelRect.x + params.labelRect.width;
            return {
              labelLinePoints: points
            };
          },
          data: inOutData
        }
      ],
    };
  }

  goBack(): void {
    this.location.back();
  }

}
