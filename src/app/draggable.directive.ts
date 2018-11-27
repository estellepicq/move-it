import { Directive, ElementRef, Input, OnInit, Output, EventEmitter, OnDestroy } from '@angular/core';
import { Observable, fromEvent, Subscription } from 'rxjs';
import { map, takeUntil, mergeMap, filter, tap } from 'rxjs/operators';

interface MousePosition {
  left: number;
  top: number;
}

interface DraggablePosition {
  initLeft: number;
  initTop: number;
  offsetLeft: number;
  offsetTop: number;
}

interface DraggableMovingPosition extends DraggablePosition {
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
export class DraggableDirective implements OnInit, OnDestroy {

  // Options
  @Input() draggableFrom: string;
  @Input() bounds: HTMLElement;
  @Input() grid: number[];

  // Emitted events
  @Output() mDragStart: EventEmitter<DraggablePosition> = new EventEmitter<DraggablePosition>();
  @Output() mDragMove: EventEmitter<DraggableMovingPosition> = new EventEmitter<DraggableMovingPosition>();
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
  draggableInitLeft: number;
  draggableInitTop: number;

  // Event observables
  mousedown$: Observable<MouseEvent>;
  mousemove$: Observable<MouseEvent>;
  mouseup$: Observable<MouseEvent>;
  mousedrag$: Observable<MousePosition>;
  windowResize$: Observable<Event> = fromEvent(window, 'resize');
  mousedragSub: Subscription;

  constructor(
    private el: ElementRef,
  ) {
    this.windowResize$.subscribe((wrEvent) => {
      // Get container dimensions
      this.getContainerDimensions();
      // Get draggable bounds
      this.getDraggableDimensions();
      // Move element
      const offsetLeft = this.getDraggableAttribute('m-offset-x');
      const offsetTop = this.getDraggableAttribute('m-offset-y');
      this.move(offsetLeft, offsetTop);
    });
  }

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

    // Get container dimensions
    this.getContainerDimensions();

    // Get draggable bounds
    this.getDraggableDimensions();

    // Handle from a specific part of draggable element
    this.handle = this.draggable;
    if (this.draggableFrom) {
      this.handle = this.draggable.querySelector('#' + this.draggableFrom);
    }

    // Create event listeners
    this.mousedown$ = fromEvent(this.handle, 'mousedown') as Observable<MouseEvent>;
    this.mousemove$ = fromEvent(document, 'mousemove') as Observable<MouseEvent>;
    this.mouseup$ = fromEvent(document, 'mouseup') as Observable<MouseEvent>;
    // this.windowResize$ = fromEvent(window, 'resize');

    // Create mousedrag observable
    this.mousedrag$ = this.createMousedragObservable();

    // Listen to mousedrag observable
    this.mousedragSub = this.listenMousedragObservable();
  }

  ngOnDestroy() {
    this.mousedragSub.unsubscribe();
  }

  createMousedragObservable(): Observable<MousePosition> {
    return this.mousedown$.pipe(
      // Only from left button
      filter(mdEvent => mdEvent.button === 0),
      tap(() => {
        document.body.classList.add('no-select');
        const startPos: DraggablePosition = {
          initLeft: this.draggableInitLeft,
          initTop: this.draggableInitTop,
          offsetLeft: 0,
          offsetTop: 0
        };
        this.mDragStart.emit(startPos);
      }),
      mergeMap(mdEvent => {
        // get pointer start position
        const startX = mdEvent.clientX - this.getDraggableAttribute('m-offset-x');
        const startY = mdEvent.pageY - this.getDraggableAttribute('m-offset-y');
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
          // stop listening on mouseup
          takeUntil(this.mouseup$.pipe(
            tap(() => {
              document.body.classList.remove('no-select');
              this.clearSelection();
              const finalPos: DraggablePosition = {
                initLeft: this.draggableInitLeft,
                initTop: this.draggableInitTop,
                offsetLeft: this.getDraggableAttribute('m-offset-x'),
                offsetTop: this.getDraggableAttribute('m-offset-y')
              };
              this.mDragStop.emit(finalPos);
            })
          ))
        );
      }),
    );
  }

  listenMousedragObservable(): Subscription {
    return this.mousedrag$.subscribe(mousePos => {
      this.move(mousePos.left, mousePos.top);
    });
  }

  move(leftPos: number, topPos: number): void {
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
    if (newTopPos < bounds.boundTop) {
      newTopPos = bounds.boundTop;
      topEdge = true;
    }
    if (newTopPos > bounds.boundBottom) {
      newTopPos = bounds.boundBottom;
      bottomEdge = true;
    }

    const movingPos: DraggableMovingPosition = {
      initLeft: this.draggableInitLeft,
      initTop: this.draggableInitTop,
      offsetLeft: newLeftPos,
      offsetTop: newTopPos,
      leftEdge: leftEdge,
      rightEdge: rightEdge,
      topEdge: topEdge,
      bottomEdge: bottomEdge
    };

    // Move draggable element
    this.draggable.style.transform = 'translate(' + movingPos.offsetLeft + 'px, ' + movingPos.offsetTop + 'px)';

    // Update m-offset-x and m-offset-y
    this.setDraggableAttribute('m-offset-x', movingPos.offsetLeft);
    this.setDraggableAttribute('m-offset-y', movingPos.offsetTop);

    // Emit position
    this.mDragMove.emit(movingPos);
  }

  getContainerDimensions(): void {
    if (this.bounds) {
      const borderWidth = parseInt(window.getComputedStyle(this.bounds).borderWidth, 10);
      this.containerWidth = this.bounds.clientWidth;
      this.containerHeight = this.bounds.scrollHeight;
      this.containerLeft = this.draggableAbsolutePosition ? borderWidth : this.bounds.offsetLeft + borderWidth;
      this.containerTop = this.draggableAbsolutePosition ? borderWidth : this.bounds.offsetTop + borderWidth;
    } else {
      this.containerWidth = document.body.scrollWidth;
      this.containerHeight = document.body.scrollHeight;
      this.containerLeft = 0;
      this.containerTop = 0;
    }
  }

  getDraggableDimensions() {
    this.draggableRect = this.draggable.getBoundingClientRect();
    this.draggableWidth = this.draggableRect.width;
    this.draggableHeight = this.draggableRect.height;
    this.draggableInitLeft = this.draggableAbsolutePosition ? this.draggableRect.left : this.draggable.offsetLeft - this.containerLeft;
    this.draggableInitTop = this.draggableAbsolutePosition ? this.draggableRect.top : this.draggable.offsetTop - this.containerTop;
    this.setDraggableAttribute('m-init-x', this.draggableInitLeft);
    this.setDraggableAttribute('m-init-y', this.draggableInitTop);
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

  setDraggableAttribute(attr: string, value: number): void {
    this.draggable.setAttribute(attr, value.toString());
  }

  getDraggableAttribute(attr: string): number {
    return +this.draggable.getAttribute(attr);
  }

}

