import { Component, OnInit, Inject } from '@angular/core';
import { MatDialog, MAT_DIALOG_DATA} from '@angular/material/dialog';
import { FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';

import { MailService } from '../_services/mail.service';

@Component({
  selector: 'app-mail',
  templateUrl: './mail.component.html',
  styleUrls: ['./mail.component.scss']
})
export class MailComponent implements OnInit {

  //Global form
  public mailForm: FormGroup;

  constructor(
    private formBuilder: FormBuilder,
    public mailService: MailService,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) { }

  ngOnInit(): void {
    this.mailForm = new FormGroup({
      'emetteur': new FormControl({ value:this.data.emetteur, disabled: this.data.emetteur!='' }, [
        Validators.required,
        Validators.pattern('[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+')
      ]),
      'destinataires': new FormControl({ value:this.data.destinataires, disabled: false}, [
        Validators.required,
        Validators.pattern('([A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+;*)+')
      ]),
      'sujet': new FormControl(this.data.sujet, [
        Validators.required,
        Validators.minLength(5)
      ]),
      'contenu': new FormControl(this.data.contenu, [
        Validators.required,
        Validators.minLength(5)
      ])
    });
  }

  get emetteur() { return this.mailForm.get('emetteur'); }
  get destinataires() { return this.mailForm.get('destinataires'); }
  get sujet() { return this.mailForm.get('sujet'); }
  get contenu() { return this.mailForm.get('contenu'); }

  public sendMail(){
    //Get all values including disabled fields
    const mailRawValue = this.mailForm.getRawValue();
    // Send the mail through the send mail service
    this.mailService.sendMail(mailRawValue.sujet, mailRawValue.contenu, mailRawValue.emetteur, mailRawValue.destinataires);
    // Stop here : if called from a dialog then the dialog will self close
  }

}
