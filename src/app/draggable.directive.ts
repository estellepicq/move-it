import { Directive, ElementRef } from '@angular/core';
import { Observable, fromEvent } from 'rxjs';
import { switchMap, map, takeUntil, take } from 'rxjs/operators';

@Directive({
  selector: '[appDraggable]'
})
export class DraggableDirective {

  draggable: HTMLElement;
  mousedown$: Observable<MouseEvent>;
  mousemove$: Observable<MouseEvent>;
  mouseup$: Observable<MouseEvent>;
  mousedrag$: Observable<any>;
  yPos: number;
  xPos: number;

  constructor(
    el: ElementRef,
  ) {
    this.draggable = el.nativeElement;

    this.mousedown$ = fromEvent(this.draggable, 'mousedown') as Observable<MouseEvent>;
    this.mousemove$ = fromEvent(document, 'mousemove') as Observable<MouseEvent>;
    this.mouseup$ = fromEvent(this.draggable, 'mouseup') as Observable<MouseEvent>;

    this.mousedrag$ = this.mousedown$.pipe(
      switchMap(mdEvent => {
        const startX = mdEvent.clientX - parseInt(el.nativeElement.style.left, 10);
        const startY = mdEvent.clientY - parseInt(el.nativeElement.style.top, 10);
        return this.mousemove$.pipe(
          map(mmEvent => {
            return {
              left: mmEvent.clientX  - startX,
              top: mmEvent.pageY - startY,
            };
          }),
          takeUntil(this.mouseup$)
        );
      })
    );

    this.mousedrag$.subscribe(pos => {
      this.draggable.style.top = pos.top + 'px';
      this.draggable.style.left = pos.left + 'px';
    });
  }

}

