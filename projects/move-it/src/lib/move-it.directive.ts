import { Directive, ElementRef, Input, Output, EventEmitter, OnDestroy, AfterViewInit, OnChanges, SimpleChanges } from '@angular/core';
import { Observable, fromEvent, Subscription, merge } from 'rxjs';
import { map, takeUntil, mergeMap, filter, tap } from 'rxjs/operators';
import { MoveItService } from './move-it.service';
import { IPosition } from './move-it-types';

@Directive({
  selector: '[ngMoveit]',
  providers: [MoveItService]
})
export class MoveItDirective implements AfterViewInit, OnDestroy, OnChanges {

  @Input() draggableFrom: string;
  @Input() bounds: HTMLElement = document.body;
  @Input() columnWidth = 1;
  @Input() dashboardDimensionsChanged: number;
  @Input() scale = 1;
  @Input() scrollableContainer: HTMLElement = document.body;

  // Emitted events
  @Output() mDragStart: EventEmitter<IPosition> = new EventEmitter<IPosition>();
  @Output() mDragMove: EventEmitter<IPosition> = new EventEmitter<IPosition>();
  @Output() mDragStop: EventEmitter<IPosition> = new EventEmitter<IPosition>();

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
  drag$: Observable<IPosition>;
  dragSub: Subscription;

  // Window size
  windowResize$: Observable<Event> = fromEvent(window, 'resize');
  windowResizeSub: Subscription;

  constructor(
    private el: ElementRef,
    private moveitService: MoveItService
  ) { }

  ngAfterViewInit(): void {
    // Find draggable element and disable html drag
    this.moveitService.draggable = this.el.nativeElement;
    this.moveitService.draggable.draggable = false;

    // Get dimensions
    setTimeout(() => {
      this.moveitService.getContainerDimensions(this.bounds, this.scrollableContainer);
      this.moveitService.initDraggableDimensions();
      this.moveitService.draggableLeftRatio = 0;
      this.moveitService.draggableTopRatio = 0;
      this.moveitService.getBounds();
    }, 200);

    // Handle from a specific part of draggable element
    this.moveitService.handle = this.moveitService.draggable;
    if (this.draggableFrom) {
      this.moveitService.handle = this.moveitService.draggable.querySelector('.' + this.draggableFrom);
    }

    // Create event listeners
    this.mousedown$ = fromEvent(this.moveitService.handle, 'mousedown') as Observable<MouseEvent>;
    this.mousemove$ = fromEvent(document, 'mousemove') as Observable<MouseEvent>;
    this.mouseup$ = fromEvent(document, 'mouseup') as Observable<MouseEvent>;
    this.touchstart$ = fromEvent(this.moveitService.handle, 'touchstart', { passive: true }) as Observable<TouchEvent>;
    this.touchmove$ = fromEvent(document, 'touchmove') as Observable<TouchEvent>;
    this.touchend$ = fromEvent(document, 'touchend') as Observable<TouchEvent>;
    this.touchcancel$ = fromEvent(document, 'touchcancel') as Observable<TouchEvent>;
    this.start$ = merge(this.mousedown$, this.touchstart$);
    this.move$ = merge(this.mousemove$, this.touchmove$);
    this.stop$ = merge(this.mouseup$, this.touchend$, this.touchcancel$);

    // Create mousedrag observable
    this.drag$ = this.initDragObservable();

    // Listen to mousedrag observable
    this.dragSub = this.drag$.subscribe(pos => {
      this.move(pos.x, pos.y);
    });

    // Listen to window resize observable
    this.windowResizeSub = this.windowResize$.subscribe(() => {
      // Get container dimensions
      this.moveitService.getContainerDimensions(this.bounds, this.scrollableContainer);
      this.moveitService.initDraggableDimensions();
      // Get container bounds
      this.moveitService.getBounds();
      // Move element proportionnally to its container
      if (this.bounds === document.body) {
        this.move(this.moveitService.containerDimensions.width * this.moveitService.draggableLeftRatio, this.moveitService.containerDimensions.height * this.moveitService.draggableTopRatio);
      }
    });
  }

  ngOnDestroy(): void {
    this.dragSub.unsubscribe();
    this.windowResizeSub.unsubscribe();
  }

  initDragObservable(): Observable<IPosition> {
    // START LISTENER
    return this.start$.pipe(
      // Only from left button or any touch event
      filter(mdEvent => ((mdEvent instanceof MouseEvent
        && mdEvent.button === 0 // left click
        && (this.draggableFrom // draggableFrom provided
        && (mdEvent.target as Element).classList.contains(this.draggableFrom) // only handle (and not handle children)
        || (this.draggableFrom === undefined && !(mdEvent.target as Element).classList.contains('resize-handle'))) // exclude resize-handle
        || mdEvent instanceof TouchEvent)
        )
      ),
      mergeMap(mdEvent => {
        const mdPos: IPosition = this.onMouseDown(mdEvent);
        // Listen to mousemove
        return this.move$.pipe(
          map(mmEvent => {
            const mmPos: IPosition = this.onMouseMove(mmEvent);
            const pos: IPosition = {
              x: mmPos.x - mdPos.initX,
              y: mmPos.y - mdPos.initY,
            };
            return pos;
          }),
          // Stop listening on mouseup
          takeUntil(this.stop$.pipe(
            tap(() => this.onMouseUp())
          ))
        );
      }),
    );
  }

  onMouseDown(mdEvent: MouseEvent | TouchEvent): IPosition {
    // Disable native behavior of some elements inside the draggable element (ex: images)
    this.moveitService.draggable.style.pointerEvents = 'none';
    // Special class to disable text hightlighting
    document.body.classList.add('no-select', 'dragging');

    // Get pointer start position and return it
    const mdX = mdEvent instanceof MouseEvent ? mdEvent.pageX : mdEvent.touches[0].pageX;
    const mdY = mdEvent instanceof MouseEvent ? mdEvent.pageY : mdEvent.touches[0].pageY;
    const initX = mdX - this.moveitService.getOffsetX() * this.scale + this.scrollableContainer.scrollLeft;
    const initY = mdY - this.moveitService.getOffsetY() * this.scale + this.scrollableContainer.scrollTop;

    // Emit draggable start position
    const startPos: IPosition = {
      item: this.moveitService.draggable,
      initX: initX,
      initY: initY,
    };
    this.mDragStart.emit(startPos);
    return startPos;
  }

  onMouseMove(mmEvent: MouseEvent | TouchEvent): IPosition {
    // Get mouse / touch position
    const mmX = mmEvent instanceof MouseEvent ? mmEvent.pageX : mmEvent.touches[0].pageX;
    const mmY = mmEvent instanceof MouseEvent ? mmEvent.pageY : mmEvent.touches[0].pageY;

    // Return position
    return {
      x: mmX + this.scrollableContainer.scrollLeft,
      y: mmY + this.scrollableContainer.scrollTop,
    };
  }

  onMouseUp(): void {
    // Remove styles
    this.moveitService.draggable.style.pointerEvents = 'unset';
    document.body.classList.remove('no-select', 'dragging');
    this.moveitService.clearSelection();

    const shadowOffset = this.moveitService.draggable.style.filter.match(/[-]{0,1}[\d]*[\.]{0,1}[\d]+/g);
    const shadowOffsetX = shadowOffset ? parseFloat(shadowOffset[4]) : 0;
    const shadowOffsetY = shadowOffset ? parseFloat(shadowOffset[5]) : 0;
    this.moveitService.draggable.style.filter = 'unset';

    const finalPos: IPosition = {
      item: this.moveitService.draggable,
      initX: this.moveitService.draggableDimensions.left,
      initY: this.moveitService.draggableDimensions.top,
      x: this.moveitService.getOffsetX() + shadowOffsetX,
      y: this.moveitService.getOffsetY() + shadowOffsetY
    };

    // Update draggable style
    const translateX = 'translateX(' + finalPos.x + 'px) ';
    const translateY = 'translateY(' + finalPos.y + 'px)';
    this.moveitService.draggable.style.transform = translateX + translateY;

    // This is for window resize
    this.moveitService.draggableLeftRatio = finalPos.x / this.moveitService.containerDimensions.width;
    this.moveitService.draggableTopRatio = finalPos.y / this.moveitService.containerDimensions.height;

    // Emit position
    this.mDragStop.emit(finalPos);
  }

  move(leftPos: number, topPos: number): void {
     // Check bounds
     const checkedPos = this.moveitService.checkBounds(leftPos, topPos, this.columnWidth);

     const movingPos: IPosition = {
       item: this.moveitService.draggable,
       initX: this.moveitService.draggableDimensions.left,
       initY: this.moveitService.draggableDimensions.top,
       x: checkedPos.x,
       y: checkedPos.y
     };

     // Move draggable element
     const translateX = 'translateX(' + leftPos + 'px) ';
     const translateY = 'translateY(' + topPos + 'px)';
     this.moveitService.draggable.style.transform = translateX + translateY;

     const shadowFilter = 'drop-shadow(rgba(0, 0, 0, 0.2) ' + (movingPos.x - leftPos) + 'px ' +
       (movingPos.y - topPos) + 'px 0px)';
     this.moveitService.draggable.style.filter = shadowFilter;

    // Emit position
    this.mDragMove.emit(movingPos);
  }

  ngOnChanges(changes: SimpleChanges) {
    // new pages added to dashboard or dezoomed dashboard
    if (changes.dashboardDimensionsChanged &&
      !changes.dashboardDimensionsChanged.firstChange &&
      changes.dashboardDimensionsChanged.previousValue !== changes.dashboardDimensionsChanged.currentValue) {
      this.moveitService.getContainerDimensions(this.bounds, this.scrollableContainer);
      this.moveitService.initDraggableDimensions();
      this.moveitService.getBounds();
      this.moveitService.draggableLeftRatio = this.moveitService.getOffsetX() / this.moveitService.containerDimensions.width;
      this.moveitService.draggableTopRatio = this.moveitService.getOffsetY() / this.moveitService.containerDimensions.height;
    }

    if (changes.draggableFrom && !changes.draggableFrom.firstChange) {
      // Change of draggableFrom input
      this.moveitService.handle = this.moveitService.draggable;
      if (this.draggableFrom) {
        setTimeout(() => this.moveitService.handle = this.moveitService.draggable.querySelector('.' + this.draggableFrom));
      }
      this.mousedown$ = fromEvent(this.moveitService.handle, 'mousedown') as Observable<MouseEvent>;
      this.touchstart$ = fromEvent(this.moveitService.handle, 'touchstart') as Observable<TouchEvent>;
      this.start$ = merge(this.mousedown$, this.touchstart$);
      this.drag$ = this.initDragObservable();
      this.dragSub = this.drag$.subscribe(mousePos => {
        this.move(mousePos.x, mousePos.y);
      });
    }
  }

}
