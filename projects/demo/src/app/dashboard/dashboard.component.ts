import { Component, OnInit, ElementRef } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {

  constructor(
    private el: ElementRef,
    ) { }

  ngOnInit() {
  }

  onMove(event): void {
    const positionElt = this.el.nativeElement.querySelector('#position');
    positionElt.textContent = `top: ${event.initTop + event.offsetTop}px; left: ${event.initLeft + event.offsetLeft}px`;
  }

}

