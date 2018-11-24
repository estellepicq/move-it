import { Directive, ElementRef, Input, OnInit } from '@angular/core';
import { Observable, fromEvent } from 'rxjs';
import { map, takeUntil, mergeMap, filter, tap } from 'rxjs/operators';

interface MousePosition {
  left: number;
  top: number;
}

@Directive({
  selector: '[appDraggable]'
})
export class DraggableDirective implements OnInit {

  @Input() draggableFrom: string;
  @Input() bounds: HTMLElement;
  draggable: HTMLElement;
  handle: HTMLElement;
  draggablePosition: string;
  mousedown$: Observable<MouseEvent>;
  mousemove$: Observable<MouseEvent>;
  mouseup$: Observable<MouseEvent>;
  mousedrag$: Observable<MousePosition>;

  constructor(
    private el: ElementRef,
  ) { }

  ngOnInit() {
    // Find draggable element
    this.draggable = this.el.nativeElement;
    this.draggablePosition = window.getComputedStyle(this.draggable).getPropertyValue('position');

    // Handle from a specific part of draggable element
    this.handle = this.draggable;
    if (this.draggableFrom) {
      this.handle = this.draggable.querySelector('#' + this.draggableFrom);
    }

    this.mousedown$ = fromEvent(this.handle, 'mousedown') as Observable<MouseEvent>;
    this.mousemove$ = fromEvent(document, 'mousemove') as Observable<MouseEvent>;
    this.mouseup$ = fromEvent(document, 'mouseup') as Observable<MouseEvent>;

    this.mousedrag$ = this.mousedown$.pipe(
      // Only from left button
      filter(mdEvent => mdEvent.button === 0),
      tap(() => document.body.classList.add('no-select')),
      mergeMap(mdEvent => {
        const target = mdEvent.target as HTMLElement;
        // Disable native behavior (ex: images can be dragged)
        target.style.pointerEvents = 'none';
        // get pointer start position
        const startX = mdEvent.clientX - +this.draggable.getAttribute('data-x');
        const startY = mdEvent.pageY - +this.draggable.getAttribute('data-y');
        // listen to mousemove
        return this.mousemove$.pipe(
          map(mmEvent => {
            return {
              left: mmEvent.clientX - startX,
              top: mmEvent.pageY - startY,
            };
          }),
          // stop listening to mousemove on mouseup
          takeUntil(this.mouseup$.pipe(
            tap(() => {
              document.body.classList.remove('no-select');
              this.clearSelection();
              // Enable native behavior (ex: images can be dragged)
              target.style.pointerEvents = 'unset';
            })
          ))
        );
      }),
    );

    this.mousedrag$.subscribe(pos => {
      // Get container bounds
      let containerWidth = Infinity;
      let containerHeight = Infinity;
      let containerTop = 0;
      let containerLeft = 0;
      if (this.bounds) {
        const containerRect = this.bounds.getBoundingClientRect();
        containerWidth = containerRect.width;
        containerHeight = containerRect.height;
        containerLeft = containerRect.left;
        containerTop = containerRect.top;
      }
      // Get draggable bounds
      const draggableRect = this.draggable.getBoundingClientRect();
      // Get left and top position from the mouse
      let finalLeft: number = pos.left;
      let finalTop: number = pos.top;
        if (this.draggablePosition === 'absolute'
            || this.draggablePosition === 'fixed'
            || this.draggablePosition === 'sticky'
            || this.draggablePosition === 'relative') { // top and left properties can apply
                this.bounds.style.position = 'relative';
                if (pos.left < 0) { finalLeft = 0; }
                if (pos.left > containerWidth - draggableRect.width) { finalLeft = containerWidth - draggableRect.width; }
                if (pos.top < 0) { finalTop = 0; }
                if (pos.top > containerHeight) { finalTop = containerHeight; }
                this.draggable.style.left = finalLeft + 'px';
                this.draggable.style.top = finalTop + 'px';
        } else { // top and left cannot apply - use transform instead
          if (pos.left <  containerLeft - this.draggable.offsetLeft) {
            finalLeft = containerLeft - this.draggable.offsetLeft;
          }
          if (pos.left >  containerWidth - draggableRect.width - this.draggable.offsetLeft + containerLeft) {
            finalLeft = containerWidth - draggableRect.width - this.draggable.offsetLeft + containerLeft;
          }
          if (pos.top <  containerTop - this.draggable.offsetTop) {
            finalTop = containerTop - this.draggable.offsetTop;
          }
          if (pos.top >  containerHeight - draggableRect.height - this.draggable.offsetTop + containerTop) {
            finalTop = containerHeight - draggableRect.height - this.draggable.offsetTop + containerTop;
          }
          this.draggable.style.transform = 'translate(' + finalLeft + 'px, ' + finalTop + 'px)';
        }
        // In each case, set data-x and data-y
        this.draggable.setAttribute('data-x', finalLeft.toString());
        this.draggable.setAttribute('data-y', finalTop.toString());
    });
  }

  clearSelection() {
    if (window.getSelection) {
      window.getSelection().removeAllRanges();
    }
  }

}

