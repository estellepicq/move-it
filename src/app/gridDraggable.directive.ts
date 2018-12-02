import { Directive, ElementRef, Input, OnInit, Output, EventEmitter, OnDestroy, AfterViewInit } from '@angular/core';
import { Observable, fromEvent, Subscription, merge } from 'rxjs';
import { map, takeUntil, mergeMap, filter, tap } from 'rxjs/operators';
import { DraggablePosition,
  DraggableMovingPosition,
  MousePosition,
  Bounds,
  Grid,
  DimensionsPx,
  DimensionsOnGrid } from './models/draggable-types';

@Directive({
  selector: '[appGridDraggable]'
})
export class GridDraggableDirective implements AfterViewInit, OnDestroy {

  // Options
  @Input() draggableFrom: string;
  @Input() bounds: HTMLElement = document.body;
  @Input() columns: number;
  @Input() rows: number;
  @Input() item: DimensionsOnGrid;

  // Emitted events
  @Output() mDragStart: EventEmitter<DraggablePosition> = new EventEmitter<DraggablePosition>();
  @Output() mDragMove: EventEmitter<DraggableMovingPosition> = new EventEmitter<DraggableMovingPosition>();
  @Output() mDragStop: EventEmitter<DraggablePosition> = new EventEmitter<DraggablePosition>();

  // Draggable element
  draggable: HTMLElement;
  handle: HTMLElement;

  // Draggable and container positions
  containerDimensions: DimensionsPx;
  containerBounds: Bounds;
  draggableDimensions: DimensionsPx;
  draggableLeftRatio: number;
  draggableTopRatio: number;
  grid: Grid;

  // Event observables
  mousedown$: Observable<MouseEvent>;
  mousemove$: Observable<MouseEvent>;
  mouseup$: Observable<MouseEvent>;
  touchstart$: Observable<TouchEvent>;
  touchmove$: Observable<TouchEvent>;
  touchend$: Observable<TouchEvent>;
  touchcancel$: Observable<TouchEvent>;
  start$: Observable<MouseEvent | TouchEvent>;
  move$: Observable<MouseEvent | TouchEvent>;
  stop$: Observable<MouseEvent | TouchEvent>;
  drag$: Observable<MousePosition>;
  dragSub: Subscription;

  // Window size
  windowResize$: Observable<Event> = fromEvent(window, 'resize');
  windowResizeSub: Subscription;

  constructor(
    private el: ElementRef,
  ) { }

  ngAfterViewInit() {
    // Find draggable element and disable html drag
    this.draggable = this.el.nativeElement;
    this.draggable.draggable = false;

    // Get dimensions
    setTimeout(() => {
      this.getContainerDimensions();
      this.initDraggableDimensions();
      this.containerBounds = this.getBounds();
    }, 100);

    // Get grid
    this.grid = this.getGrid();

    // Handle from a specific part of draggable element
    this.handle = this.draggable;
    if (this.draggableFrom) {
      this.handle = this.draggable.querySelector('#' + this.draggableFrom);
    }

    // Create event listeners
    this.mousedown$ = fromEvent(this.handle, 'mousedown') as Observable<MouseEvent>;
    this.mousemove$ = fromEvent(document, 'mousemove') as Observable<MouseEvent>;
    this.mouseup$ = fromEvent(document, 'mouseup') as Observable<MouseEvent>;
    this.touchstart$ = fromEvent(this.handle, 'touchstart') as Observable<TouchEvent>;
    this.touchmove$ = fromEvent(document, 'touchmove') as Observable<TouchEvent>;
    this.touchend$ = fromEvent(document, 'touchend') as Observable<TouchEvent>;
    this.touchcancel$ = fromEvent(document, 'touchcancel') as Observable<TouchEvent>;
    this.start$ = merge(this.mousedown$, this.touchstart$);
    this.move$ = merge(this.mousemove$, this.touchmove$);
    this.stop$ = merge(this.mouseup$, this.touchend$, this.touchcancel$);

    // Create mousedrag observable
    this.drag$ = this.initDragObservable();

    // Listen to mousedrag observable
    this.dragSub = this.drag$.subscribe(mousePos => {
      this.move(mousePos.left, mousePos.top);
    });

    // Listen to window resize observable
    this.windowResizeSub = this.windowResize$.subscribe(() => {
      // Get container & grid dimensions
      this.getContainerDimensions();
      // Get container bounds
      this.containerBounds = this.getBounds();
      // Get grid
      this.grid = this.getGrid();
      // Move element proportionnally to its container
      this.move(this.containerDimensions.width * this.draggableLeftRatio,
        this.containerDimensions.height * this.draggableTopRatio);
    });
  }

  ngOnDestroy() {
    this.dragSub.unsubscribe();
    this.windowResizeSub.unsubscribe();
  }

  initDragObservable(): Observable<MousePosition> {
    // START LISTENER
    return this.start$.pipe(
      // Only from left button or any touch event
      filter(mdEvent => mdEvent instanceof MouseEvent && mdEvent.button === 0 || mdEvent instanceof TouchEvent),
      mergeMap(mdEvent => {
        const mdPos: MousePosition = this.onMouseDown(mdEvent);
        // MOVE LISTENER
        return this.move$.pipe(
          map(mmEvent => {
            const mmPos: MousePosition = this.onMouseMove(mmEvent);
            return {
              left: mmPos.left - mdPos.left,
              top: mmPos.top - mdPos.top,
            };
          }),
          // STOP LISTENER
          takeUntil(this.stop$.pipe(
            tap(() => this.onMouseUp())
          ))
        );
      }),
    );
  }

  onMouseDown(mdEvent: MouseEvent | TouchEvent): MousePosition {
    // Disable native behavior of some elements inside the draggable element (ex: images)
    this.draggable.style.pointerEvents = 'none';
    // Add style to moving element
    this.draggable.classList.add('moving');
    // Special class to disable text hightlighting
    document.body.classList.add('no-select');
    // Disable autoscroll of touch event
    if (mdEvent instanceof TouchEvent) { // to fix: FF does not handle TouchEvent
      mdEvent.preventDefault();
    }
    // Emit draggable start position
    const startPos: DraggablePosition = {
      initLeft: this.draggableDimensions.left,
      initTop: this.draggableDimensions.top,
      offsetLeft: this.getDraggableAttribute('m-offset-x'),
      offsetTop: this.getDraggableAttribute('m-offset-y')
    };
    this.mDragStart.emit(startPos);
    // Get pointer start position and return it
    const mdClientX = mdEvent instanceof MouseEvent ? mdEvent.clientX : mdEvent.touches[0].clientX;
    const mdClientY = mdEvent instanceof MouseEvent ? mdEvent.clientY : mdEvent.touches[0].clientY;
    const startX = mdClientX - startPos.offsetLeft;
    const startY = mdClientY - startPos.offsetTop + this.bounds.scrollTop;
    return {
      left: startX,
      top: startY
    };
  }

  onMouseMove(mmEvent: MouseEvent | TouchEvent) {
    // Get mouse / touch position
    const mmClientX = mmEvent instanceof MouseEvent ? mmEvent.clientX : mmEvent.touches[0].clientX;
    const mmClientY = mmEvent instanceof MouseEvent ? mmEvent.clientY : mmEvent.touches[0].clientY;
    // Return position
    return {
      left: mmClientX,
      top: mmClientY + this.bounds.scrollTop,
    };
  }

  onMouseUp(): void {
    // Remove styles
    this.draggable.style.pointerEvents = 'unset';
    this.draggable.classList.remove('moving');
    document.body.classList.remove('no-select');
    this.clearSelection();
    // Emit position
    const finalPos: DraggablePosition = {
      initLeft: this.draggableDimensions.left,
      initTop: this.draggableDimensions.top,
      offsetLeft: this.getDraggableAttribute('m-offset-x'),
      offsetTop: this.getDraggableAttribute('m-offset-y')
    };
    this.mDragStop.emit(finalPos);
    // This is for window resize
    this.draggableLeftRatio = finalPos.offsetLeft / this.containerDimensions.width;
    this.draggableTopRatio = finalPos.offsetTop / this.containerDimensions.height;
  }

  move(leftPos: number, topPos: number): void {
    // Check bounds
    const checkedPos = this.checkBounds(leftPos, topPos);

    const movingPos: DraggableMovingPosition = {
      initLeft: this.draggableDimensions.left,
      initTop: this.draggableDimensions.top,
      offsetLeft: checkedPos.offsetLeft,
      offsetTop: checkedPos.offsetTop,
      leftEdge: checkedPos.leftEdge,
      rightEdge: checkedPos.rightEdge,
      topEdge: checkedPos.topEdge,
      bottomEdge: checkedPos.bottomEdge
    };

    // Move draggable element
    const translateX = 'translateX(' + movingPos.offsetLeft + 'px) ';
    const translateY = 'translateY(' + movingPos.offsetTop + 'px)';
    this.draggable.style.transform = translateX + translateY;

    // Update m-offset-x and m-offset-y
    this.setDraggableAttribute('m-offset-x', movingPos.offsetLeft);
    this.setDraggableAttribute('m-offset-y', movingPos.offsetTop);

    // Emit position
    this.mDragMove.emit(movingPos);
  }

  initDraggableDimensions() {
    this.draggableDimensions = {
      left: this.draggable.offsetLeft,
      top: this.draggable.offsetTop,
      width: this.draggable.clientWidth,
      height: this.draggable.clientHeight
    };
    this.draggableLeftRatio = 0;
    this.draggableTopRatio = 0;
  }

  getContainerDimensions(): void {
    const borderLeftWidth = window.getComputedStyle(this.bounds).borderLeftWidth !== '' ?
      parseInt(window.getComputedStyle(this.bounds).borderLeftWidth, 10) :
      0;
    const borderTopWidth = window.getComputedStyle(this.bounds).borderTopWidth !== '' ?
      parseInt(window.getComputedStyle(this.bounds).borderTopWidth, 10) :
      0;
    const containerRect = this.bounds.getBoundingClientRect();
    this.containerDimensions = {
      left: borderLeftWidth + containerRect.left,
      top: borderTopWidth + containerRect.top,
      width: this.bounds.clientWidth,
      height: this.bounds.scrollHeight
    };
  }

  getBounds(): Bounds {
    const boundLeft = this.draggableDimensions.left;
    const boundRight = this.containerDimensions.width - this.draggableDimensions.width - this.draggableDimensions.left;
    const boundTop = this.draggableDimensions.top;
    const boundBottom = this.containerDimensions.height - this.draggableDimensions.height - this.draggableDimensions.top;
    return {
      boundLeft: boundLeft,
      boundRight: boundRight,
      boundTop: boundTop,
      boundBottom: boundBottom
    };
  }

  checkBounds(leftPos: number, topPos: number): Partial<DraggableMovingPosition> {
    let newLeftPos = Math.round(leftPos / this.grid.columnWidth) * this.grid.columnWidth ;
    let newTopPos = Math.round(topPos / this.grid.rowHeight) * this.grid.rowHeight;
    let leftEdge = false;
    let rightEdge = false;
    let topEdge = false;
    let bottomEdge = false;

    if (newLeftPos < this.containerBounds.boundLeft) {
      newLeftPos = this.containerBounds.boundLeft;
      leftEdge = true;
    }
    if (newLeftPos > this.containerBounds.boundRight) {
      newLeftPos = this.containerBounds.boundRight;
      rightEdge = true;
    }
    if (newTopPos < this.containerBounds.boundTop) {
      newTopPos = this.containerBounds.boundTop;
      topEdge = true;
    }
    if (newTopPos > this.containerBounds.boundBottom) {
      newTopPos = this.containerBounds.boundBottom;
      bottomEdge = true;
    }

    return {
      offsetLeft: newLeftPos,
      offsetTop: newTopPos,
      leftEdge: leftEdge,
      rightEdge: rightEdge,
      topEdge: topEdge,
      bottomEdge: bottomEdge
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

  getGrid(): Grid {
    let columnWidth = 1;
    let rowHeight = 1;
    if (this.columns) {
      columnWidth = this.containerDimensions.width / this.columns;
    }
    if (this.rows) {
      rowHeight = this.containerDimensions.height / this.rows;
    }
    return {
      columnWidth: columnWidth,
      rowHeight: rowHeight
    };
  }

  resetPosition() {
    this.draggable.style.transform = 'translateX(0px) translateY(0px)';
  }

}
