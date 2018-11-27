import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-custom-drag-drop',
  templateUrl: './custom-drag-drop.component.html',
  styleUrls: ['./custom-drag-drop.component.css']
})
export class CustomDragDropComponent implements OnInit {

  constructor(
    ) { }

  ngOnInit() {
  }

  onMove(event) {
    console.log(event);
  }

}

