import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filterConfiguration'
})
export class FilterConfigurationPipe implements PipeTransform {

  constructor() {

  }

  transform(configurationItems: Object, categorie: any): any[] {
    
    let returnedFilterList: any[] = [];
    for (let [key, configurationItem] of Object.entries(configurationItems)) {
      if (configurationItem['categorie'] === categorie.id) {
        configurationItem['id'] = key;
        returnedFilterList.push(configurationItem);
      }
    }
    return returnedFilterList;
  }

}
