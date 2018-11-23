import { Directive, ElementRef, Input, OnInit } from '@angular/core';
import { Observable, fromEvent } from 'rxjs';
import { map, takeUntil, mergeMap, filter, tap } from 'rxjs/operators';

interface MousePosition {
  top: number;
  left: number;
  maxTop: number;
  maxLeft: number;
}

@Directive({
  selector: '[appDraggable]'
})
export class DraggableDirective implements OnInit {

  @Input() draggableFrom: string;
  @Input() bounds: HTMLElement;
  draggable: HTMLElement;
  handle: HTMLElement;
  mousedown$: Observable<MouseEvent>;
  mousemove$: Observable<MouseEvent>;
  mouseup$: Observable<MouseEvent>;
  mousedrag$: Observable<MousePosition>;

  constructor(
    private el: ElementRef,
  ) { }

  ngOnInit() {
    this.draggable = this.el.nativeElement;
    this.handle = this.draggable;

    if (this.draggableFrom) {
      this.handle = this.draggable.querySelector('#' + this.draggableFrom);
    }

    this.mousedown$ = fromEvent(this.handle, 'mousedown') as Observable<MouseEvent>;
    this.mousemove$ = fromEvent(document, 'mousemove') as Observable<MouseEvent>;
    this.mouseup$ = fromEvent(document, 'mouseup') as Observable<MouseEvent>;

    this.mousedrag$ = this.mousedown$.pipe(
      // only from left button
      filter(mdEvent => mdEvent.button === 0),
      tap(() => document.body.classList.add('no-select')),
      mergeMap(mdEvent => {
        // get pointer start position
        const startX = mdEvent.clientX - parseInt(this.draggable.style.left, 10);
        const startY = mdEvent.pageY - parseInt(this.draggable.style.top, 10);
        // get container bounds
        let maxLeft = Infinity;
        let maxTop = Infinity;
        if (this.bounds) {
          maxLeft = this.bounds.getBoundingClientRect().width;
          maxTop = this.bounds.getBoundingClientRect().height;
        }
        // listen to mousemove
        return this.mousemove$.pipe(
          map(mmEvent => {
            return {
              left: mmEvent.clientX - startX,
              top: mmEvent.pageY - startY,
              maxLeft: maxLeft,
              maxTop: maxTop
            };
          }),
          // stop listening to mousemove on mouseup
          takeUntil(this.mouseup$.pipe(
            tap(() => {
              document.body.classList.remove('no-select');
              this.clearSelection();
            })
          ))
        );
      }),
    );

    this.mousedrag$.subscribe(pos => {
      if (pos.top >= 0 && pos.left >= 0 && pos.top <= pos.maxTop && pos.left <= pos.maxLeft) {
        this.draggable.style.top = pos.top + 'px';
        this.draggable.style.left = pos.left + 'px';
      }
    });
  }

  clearSelection() {
    if (window.getSelection) {
      window.getSelection().removeAllRanges();
    }
  }


}

