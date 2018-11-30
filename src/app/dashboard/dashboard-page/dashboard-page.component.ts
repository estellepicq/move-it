import { Component, OnInit, Input, OnDestroy, OnChanges, SimpleChanges, ElementRef } from '@angular/core';

@Component({
  selector: 'app-dashboard-page',
  templateUrl: './dashboard-page.component.html',
  styleUrls: ['./dashboard-page.component.scss']
})
export class DashboardPageComponent implements OnInit, OnDestroy, OnChanges {

  @Input() height: number;
  @Input() dashboardWidth: number;
  @Input() columns: number;
  @Input() displayGrid = true;

  gridBounds: HTMLElement;
  gridColumns: number[];
  gridRows: number[];
  columnWidth: number;
  rows: number;
  margin: number;

  constructor(
    private el: ElementRef,
  ) { }

  ngOnInit() {
    this.gridBounds = this.el.nativeElement.parentElement;
  }

  ngOnChanges(changes: SimpleChanges) {
    this.columnWidth = this.dashboardWidth / this.columns;
    this.rows = Math.floor(this.height / this.columnWidth);
    this.margin = this.height - this.columnWidth * this.rows;
    this.gridColumns = [];
    this.gridRows = [];
    for (let i = 0; i < this.columns; i++) {
      this.gridColumns.push(i);
    }
    for (let i = 0; i < this.rows; i++) {
      this.gridRows.push(i);
    }
  }

  ngOnDestroy() {
  }

  getPageStyle(): Partial<CSSStyleDeclaration> {
    return {
      height: this.height + 'px',
      padding: this.margin / 2 + 'px 0px'
    };
  }

  getColumnStyle(i: number): Partial<CSSStyleDeclaration> {
    return {
      width: this.columnWidth + 'px',
      height: '100%',
      transform: 'translateX(' + this.columnWidth * i + 'px)',
      display: this.displayGrid ? 'block' : 'none'
    };
  }

  getRowStyle(i: number): Partial<CSSStyleDeclaration> {
    return {
      width: '100%',
      height: this.columnWidth + 'px',
      transform: 'translateY(' + this.columnWidth * i + 'px)',
      display: this.displayGrid ? 'block' : 'none'
    };
  }


}
