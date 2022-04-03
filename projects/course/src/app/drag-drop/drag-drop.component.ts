import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { fromEvent, Observable, switchMap, takeUntil } from 'rxjs';

@Component({
  selector: 'app-drag-drop',
  templateUrl: './drag-drop.component.html',
  styleUrls: ['./drag-drop.component.scss']
})
export class DragDropComponent implements OnInit {

  @ViewChild('draggable', { static: true }) draggable: ElementRef;

  private start$: Observable<MouseEvent>;
  private move$: Observable<MouseEvent>;
  private stop$: Observable<MouseEvent>;

  private drag$: Observable<MouseEvent>;

  constructor() { }

  ngOnInit(): void {
    this.start$ = fromEvent(this.draggable.nativeElement, 'mousedown');
    this.move$ = fromEvent(document, 'mousemove') as Observable<MouseEvent>;
    this.stop$ = fromEvent(document, 'mouseup') as Observable<MouseEvent>;

    this.drag$ = this.start$.pipe(
      switchMap(() => this.move$.pipe(
        takeUntil(this.stop$)
      ))
    );

    this.drag$.subscribe(event => {
      const { layerX: x, layerY: y } = event as any;
      this.draggable.nativeElement.style.transform = `translateX(${x}px) translateY(${y}px)`;
    });

  }
}
