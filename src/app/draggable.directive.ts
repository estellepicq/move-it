import { Directive, ElementRef, Input, OnInit, Output, EventEmitter, OnDestroy, AfterViewInit } from '@angular/core';
import { Observable, fromEvent, Subscription, merge } from 'rxjs';
import { map, takeUntil, mergeMap, filter, tap } from 'rxjs/operators';
import { DraggablePosition, DraggableMovingPosition, MousePosition, Bounds, Grid } from './models/draggable-types';

@Directive({
  selector: '[appDraggable]'
})
export class DraggableDirective implements OnInit, OnDestroy {

  // Options
  @Input() draggableFrom: string;
  @Input() bounds: HTMLElement = document.body;
  @Input() columns: number;
  @Input() rows: number;

  // Emitted events
  @Output() mDragStart: EventEmitter<DraggablePosition> = new EventEmitter<DraggablePosition>();
  @Output() mDragMove: EventEmitter<DraggableMovingPosition> = new EventEmitter<DraggableMovingPosition>();
  @Output() mDragStop: EventEmitter<DraggablePosition> = new EventEmitter<DraggablePosition>();

  // Draggable element
  draggable: HTMLElement;
  handle: HTMLElement;
  draggableAbsolutePosition = false;

  // Draggable and container positions
  containerWidth: number;
  containerHeight: number;
  containerLeft: number;
  containerTop: number;
  containerBounds: Bounds;
  draggableWidth: number;
  draggableHeight: number;
  draggableInitLeft: number;
  draggableInitTop: number;
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

  ngOnInit() {
    // Find draggable element and disable html drag
    this.draggable = this.el.nativeElement;
    this.draggable.draggable = false;

    // Is draggable position absolute ?
    const draggablePositionStyle = window.getComputedStyle(this.draggable).getPropertyValue('position');
    if (draggablePositionStyle === 'absolute'
      || draggablePositionStyle === 'fixed'
      || draggablePositionStyle === 'sticky'
      || draggablePositionStyle === 'relative') {
      this.draggableAbsolutePosition = true;
    }

    // Get container dimensions
    this.getContainerDimensions();

    // Get grid
    this.grid = this.getGrid();

    // Get draggable bounds
    this.initDraggableDimensions();

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
      this.move(this.containerWidth * this.draggableLeftRatio, this.containerHeight * this.draggableTopRatio);
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

  initDraggableDimensions() {
    const draggableRect = this.draggable.getBoundingClientRect();
    this.draggableWidth = draggableRect.width;
    this.draggableHeight = draggableRect.height;
    this.draggableInitLeft = this.draggableAbsolutePosition ? draggableRect.left : this.draggable.offsetLeft - this.containerLeft;
    this.draggableInitTop = this.draggableAbsolutePosition ? draggableRect.top : this.draggable.offsetTop - this.containerTop;
    this.setDraggableAttribute('m-init-x', this.draggableInitLeft);
    this.setDraggableAttribute('m-init-y', this.draggableInitTop);
    this.draggableLeftRatio = 0;
    this.draggableTopRatio = 0;
  }

  onMouseDown(mdEvent: MouseEvent | TouchEvent): MousePosition {
    // Get container bounds
    this.containerBounds = this.getBounds();
    console.log(this.containerBounds);
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
      initLeft: this.draggableInitLeft,
      initTop: this.draggableInitTop,
      offsetLeft: this.getDraggableAttribute('m-offset-x'),
      offsetTop: this.getDraggableAttribute('m-offset-y')
    };
    this.mDragStart.emit(startPos);
    // Get pointer start position and return it
    const mdClientX = mdEvent instanceof MouseEvent ? mdEvent.clientX : mdEvent.touches[0].clientX;
    const mdPageY = mdEvent instanceof MouseEvent ? mdEvent.pageY : mdEvent.touches[0].pageY;
    const startX = mdClientX - startPos.offsetLeft;
    const startY = mdPageY - startPos.offsetTop;
    return {
      left: startX,
      top: startY
    };
  }

  onMouseMove(mmEvent: MouseEvent | TouchEvent) {
    // If container is scrollable, get the distance from the top
    let scrollY = 0;
    if (this.bounds) {
      scrollY = this.bounds.scrollTop;
    }
    // Get mouse / touch position
    const mmClientX = mmEvent instanceof MouseEvent ? mmEvent.clientX : mmEvent.touches[0].clientX;
    const mmPageY = mmEvent instanceof MouseEvent ? mmEvent.pageY : mmEvent.touches[0].pageY;
    // Return position
    return {
      left: mmClientX,
      top: mmPageY + scrollY,
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
      initLeft: this.draggableInitLeft,
      initTop: this.draggableInitTop,
      offsetLeft: this.getDraggableAttribute('m-offset-x'),
      offsetTop: this.getDraggableAttribute('m-offset-y')
    };
    this.mDragStop.emit(finalPos);
    // This is for window resize
    this.draggableLeftRatio = finalPos.offsetLeft / this.containerWidth;
    this.draggableTopRatio = finalPos.offsetTop / this.containerHeight;
  }

  move(leftPos: number, topPos: number): void {
    // Check bounds
    const checkedPos = this.checkBounds(leftPos, topPos);

    const movingPos: DraggableMovingPosition = {
      initLeft: this.draggableInitLeft,
      initTop: this.draggableInitTop,
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

  getContainerDimensions(): void {
    const borderLeftWidth = window.getComputedStyle(this.bounds).borderLeftWidth !== '' ?
      parseInt(window.getComputedStyle(this.bounds).borderLeftWidth, 10) :
      0;
    const borderTopWidth = window.getComputedStyle(this.bounds).borderTopWidth !== '' ?
      parseInt(window.getComputedStyle(this.bounds).borderTopWidth, 10) :
      0;
    this.containerWidth = this.bounds.clientWidth;
    this.containerHeight = this.bounds.scrollHeight;
    this.containerLeft = this.draggableAbsolutePosition ? borderLeftWidth : this.bounds.offsetLeft + borderLeftWidth;
    this.containerTop = this.draggableAbsolutePosition ? borderTopWidth : this.bounds.offsetTop + borderTopWidth;
  }

  getBounds(): Bounds {
    const boundLeft: number = this.containerLeft - this.draggable.offsetLeft;
    const boundRight: number = this.containerWidth - this.draggableWidth - this.draggable.offsetLeft + this.containerLeft;
    const boundTop: number = this.containerTop - this.draggable.offsetTop;
    const boundBottom: number = this.containerHeight - this.draggableHeight - this.draggable.offsetTop + this.containerTop;
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
      columnWidth = this.containerWidth / this.columns;
    }
    if (this.rows) {
      rowHeight = this.containerHeight / this.rows;
    }
    return {
      columnWidth: columnWidth,
      rowHeight: rowHeight
    };
  }

}

