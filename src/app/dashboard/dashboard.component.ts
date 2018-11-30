import { Component, OnInit, ElementRef, HostListener, Input } from '@angular/core';
import { Subscription, Observable, of } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {

  dashboardDimensions: DOMRect;
  pageHeight: number;
  pages$: Observable<number[]>;
  widgetPositionRequestSub: Subscription;
  dashboardModeRatio = 0.7;

  // grid
  // tslint:disable-next-line:no-inferrable-types
  @Input() columns: number = 10;

  constructor(
    private el: ElementRef,
  ) { }

  // Listen resize event to have current dashboard width
  @HostListener('window:resize', ['$event'])
  handleResizeEvent() {
    this.dashboardDimensions = this.el.nativeElement.getBoundingClientRect();
    this.pageHeight = this.dashboardDimensions.width / this.dashboardModeRatio;
  }

  ngOnInit() {

    this.dashboardDimensions = this.el.nativeElement.getBoundingClientRect();
    this.pageHeight = this.dashboardDimensions.width / this.dashboardModeRatio;

    this.pages$ = of([0, 1]);

  }


}
