import { Injectable } from '@angular/core';

@Injectable()
export class ExportCsvService {

  constructor() { }

  private JsonToCSV(json : any): string {

    var jsonTMp = JSON.parse(json);

    const replacer = (key:any, value:any) => value === null ? '' : value // specify how you want to handle null values here
    const header = Object.keys(jsonTMp[0])
    let csv = jsonTMp.map((row: any) => header.map(fieldName => JSON.stringify(row[fieldName], replacer)).join(';'))
    csv.unshift(header.join(';'))
    csv = csv.join('\r\n')

    return csv;
  }

  downloadFile(json: any, fileName: string){

    let jsonString = this.JsonToCSV(json);
    let blob = new Blob(['\ufeff' + jsonString], { type: 'text/csv;charset=utf-8;' });
    let dwldLink = document.createElement("a");
    let url = URL.createObjectURL(blob);
    let isSafariBrowser = navigator.userAgent.indexOf('Safari') != -1 && navigator.userAgent.indexOf('Chrome') == -1;
    if (isSafariBrowser) {  //if Safari open in new window to save file with random filename.
      dwldLink.setAttribute("target", "_blank");
    }
    dwldLink.setAttribute("href", url);
    dwldLink.setAttribute("download", fileName+".csv");
    dwldLink.style.visibility = "hidden";
    document.body.appendChild(dwldLink);
    dwldLink.click();
    document.body.removeChild(dwldLink);
  }

}
