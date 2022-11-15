import { Component, OnInit, ViewChild } from '@angular/core';
import { AlertService } from '../_services/alert.service';
import { ConfigurationService } from '../_services/configuration.service';

@Component({
  selector: 'app-configuration',
  templateUrl: './configuration.component.html',
  styleUrls: ['./configuration.component.scss']
})
export class ConfigurationComponent implements OnInit {

  constructor(
    public alertService: AlertService,
    public configurationService: ConfigurationService) { }

  ngOnInit(): void {
  }

  reset(item:any) {
    this.configurationService.initValue(item);
  }

  setValue(item: any, event: any) {
    this.configurationService.setValue(item, event.target.value);
  }

}
