import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';

@Component({
  selector: 'app-sandbox',
  templateUrl: './sandbox.component.html',
  styleUrls: ['./sandbox.component.scss']
})
export class SandboxComponent implements OnInit {

  public foodCtrl: FormControl = new FormControl('');
  public output: string = '';

  constructor() { }

  ngOnInit(): void {
  }

}
