import { Directive, ElementRef, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { Observable, fromEvent } from 'rxjs';
import { map, takeUntil, mergeMap, filter, tap } from 'rxjs/operators';

interface MousePosition {
  left: number;
  top: number;
}

interface PartialDomRect {
  width: number;
  height: number;
  left: number;
  top: number;
}

interface DraggablePosition {
  initX: number;
  initY: number;
  offsetX: number;
  offsetY: number;
  leftEdge: boolean;
  rightEdge: boolean;
  topEdge: boolean;
  bottomEdge: boolean;
}

interface Bounds {
  boundLeft: number;
  boundRight: number;
  boundTop: number;
  boundBottom: number;
}

@Directive({
  selector: '[appDraggable]'
})
export class DraggableDirective implements OnInit {

  // Options
  @Input() draggableFrom: string;
  @Input() bounds: HTMLElement;
  @Input() grid: number[];

  // Emitted events
  @Output() mDragStart: EventEmitter<DraggablePosition> = new EventEmitter<DraggablePosition>();
  @Output() mDragMove: EventEmitter<DraggablePosition> = new EventEmitter<DraggablePosition>();
  @Output() mDragStop: EventEmitter<DraggablePosition> = new EventEmitter<DraggablePosition>();

  // Draggable element
  draggable: HTMLElement;
  handle: HTMLElement;
  draggableAbsolutePosition: boolean;

  // Draggable and container positions
  containerWidth: number;
  containerHeight: number;
  containerLeft: number;
  containerTop: number;
  draggableRect: any;
  draggableWidth: number;
  draggableHeight: number;

  // Event observables
  mousedown$: Observable<MouseEvent>;
  mousemove$: Observable<MouseEvent>;
  mouseup$: Observable<MouseEvent>;
  mousedrag$: Observable<MousePosition>;

  constructor(
    private el: ElementRef,
  ) { }

  ngOnInit() {
    // Find draggable element and disable html drag
    this.draggable = this.el.nativeElement;
    this.draggable.draggable = false;

    // Is draggable position absolute
    const draggablePositionStyle = window.getComputedStyle(this.draggable).getPropertyValue('position');
    if (draggablePositionStyle === 'absolute'
      || draggablePositionStyle === 'fixed'
      || draggablePositionStyle === 'sticky'
      || draggablePositionStyle === 'relative') {
      this.draggableAbsolutePosition = true;
    }

    // Get container bounds
    const containerRect: PartialDomRect = this.getContainerRect(this.bounds);
    this.containerWidth = containerRect.width;
    this.containerHeight = containerRect.height;
    this.containerLeft = containerRect.left;
    this.containerTop = containerRect.top;
    // Get draggable bounds
    this.draggableRect = this.draggable.getBoundingClientRect();
    this.draggableWidth = this.draggableRect.width;
    this.draggableHeight = this.draggableRect.height;

    // Get initial X and Y positions
    const initX = this.draggableAbsolutePosition ? this.draggableRect.left : this.draggable.offsetLeft - this.containerLeft;
    const initY = this.draggableAbsolutePosition ? this.draggableRect.top : this.draggable.offsetTop - this.containerTop;
    this.draggable.setAttribute('m-init-x', initX.toString());
    this.draggable.setAttribute('m-init-y', initY.toString());

    // Handle from a specific part of draggable element
    this.handle = this.draggable;
    if (this.draggableFrom) {
      this.handle = this.draggable.querySelector('#' + this.draggableFrom);
    }

    // Create event listeners
    this.mousedown$ = fromEvent(this.handle, 'mousedown') as Observable<MouseEvent>;
    this.mousemove$ = fromEvent(document, 'mousemove') as Observable<MouseEvent>;
    this.mouseup$ = fromEvent(document, 'mouseup') as Observable<MouseEvent>;

    // Create drag observable
    this.mousedrag$ = this.mousedown$.pipe(
      // Only from left button
      filter(mdEvent => mdEvent.button === 0),
      tap(() => document.body.classList.add('no-select')),
      mergeMap(mdEvent => {
        // get pointer start position
        const startX = mdEvent.clientX - +this.draggable.getAttribute('m-offset-x');
        const startY = mdEvent.pageY - +this.draggable.getAttribute('m-offset-y');
        // listen to mousemove
        return this.mousemove$.pipe(
          map(mmEvent => {
            let scrollY = 0;
            if (this.bounds) {
              scrollY = this.bounds.scrollTop;
            }
            return {
              left: mmEvent.clientX - startX,
              top: mmEvent.pageY - startY + scrollY,
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

    // Listen to drag observable
    this.mousedrag$.pipe(
    ).subscribe(pos => {

      // Get left and top position from the mouse
      const finalPos: DraggablePosition = this.move(pos.left, pos.top);
      this.draggable.style.transform = 'translate(' + finalPos.offsetX + 'px, ' + finalPos.offsetY + 'px)';

      // In each case, set data-x and data-y
      this.draggable.setAttribute('m-offset-x', finalPos.offsetX.toString());
      this.draggable.setAttribute('m-offset-y', finalPos.offsetY.toString());

      // Emit position
      this.mDragMove.emit(finalPos);
    });
  }

  move(leftPos: number, topPos: number): DraggablePosition {
    let newLeftPos = leftPos;
    let newTopPos = topPos;
    let leftEdge = false;
    let rightEdge = false;
    let topEdge = false;
    let bottomEdge = false;
    const bounds = this.getBounds();

    if (newLeftPos < bounds.boundLeft) {
      newLeftPos = bounds.boundLeft;
      leftEdge = true;
    }
    if (newLeftPos > bounds.boundRight) {
      newLeftPos = bounds.boundRight;
      rightEdge = true;
    }
    if (topPos < bounds.boundTop) {
      newTopPos = bounds.boundTop;
      topEdge = true;
    }
    if (topPos > bounds.boundBottom) {
      newTopPos = bounds.boundBottom;
      bottomEdge = true;
    }
    return {
      initX: +this.draggable.getAttribute('m-init-x'),
      initY: +this.draggable.getAttribute('m-init-y'),
      offsetX: newLeftPos,
      offsetY: newTopPos,
      leftEdge: leftEdge,
      rightEdge: rightEdge,
      topEdge: topEdge,
      bottomEdge: bottomEdge
    };
  }

  getContainerRect(boundContainer: HTMLElement): PartialDomRect {
    if (boundContainer) {
      const borderWidth = parseInt(window.getComputedStyle(boundContainer).borderWidth, 10);
      return {
        width: boundContainer.clientWidth,
        height: boundContainer.scrollHeight,
        left: this.draggableAbsolutePosition ? borderWidth : boundContainer.offsetLeft + borderWidth,
        top: this.draggableAbsolutePosition ? borderWidth : boundContainer.offsetTop + borderWidth
      };
    } else {
      return {
        width: document.body.scrollWidth,
        height: document.body.scrollHeight,
        left: 0,
        top: 0
      };
    }
  }

  getBounds(): Bounds {
    let boundLeft: number;
    let boundRight: number;
    let boundTop: number;
    let boundBottom: number;
    if (this.draggableAbsolutePosition && !this.bounds) {
      boundLeft = -this.draggableRect.left;
      boundRight = this.containerWidth - this.draggableRect.left - this.draggableWidth;
      boundTop = -this.draggableRect.top;
      boundBottom = this.containerHeight;
    } else {
      boundLeft = this.containerLeft - this.draggable.offsetLeft;
      boundRight = this.containerWidth - this.draggableWidth - this.draggable.offsetLeft + this.containerLeft;
      boundTop = this.containerTop - this.draggable.offsetTop;
      boundBottom = this.containerHeight - this.draggableHeight - this.draggable.offsetTop + this.containerTop;
    }
    return {
      boundLeft: boundLeft,
      boundRight: boundRight,
      boundTop: boundTop,
      boundBottom: boundBottom
    };
  }

  clearSelection(): void {
    if (window.getSelection) {
      window.getSelection().removeAllRanges();
    }
  }

}

