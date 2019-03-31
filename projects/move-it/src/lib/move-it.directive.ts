import { Directive, ElementRef, Input, Output, EventEmitter, OnDestroy, AfterViewInit, OnChanges, SimpleChanges } from '@angular/core';
import { Observable, fromEvent, Subscription, merge } from 'rxjs';
import { map, takeUntil, mergeMap, filter, tap } from 'rxjs/operators';
import { MoveItService } from './move-it.service';
import { IDraggable, IPosition } from './move-it-types';

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
  @Output() mDragStart: EventEmitter<IDraggable> = new EventEmitter<IDraggable>();
  @Output() mDragMove: EventEmitter<IDraggable> = new EventEmitter<IDraggable>();
  @Output() mDragStop: EventEmitter<IDraggable> = new EventEmitter<IDraggable>();

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

  ngAfterViewInit() {
    // Find draggable element and disable html drag
    this.moveitService.draggable = this.el.nativeElement;
    this.moveitService.draggable.draggable = false;

    // Get dimensions
    setTimeout(() => {
      this.moveitService.getContainerDimensions(this.bounds);
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
    this.dragSub = this.drag$.subscribe(mousePos => {
      this.move(mousePos.x, mousePos.y);
    });

    // Listen to window resize observable
    this.windowResizeSub = this.windowResize$.subscribe(() => {
      // Get container dimensions
      this.moveitService.getContainerDimensions(this.bounds);
      this.moveitService.initDraggableDimensions();
      // Get container bounds
      this.moveitService.getBounds();
      // Move element proportionnally to its container
      if (this.bounds === document.body) {
        this.move(this.moveitService.containerDimensions.width * this.moveitService.draggableLeftRatio,
          this.moveitService.containerDimensions.height * this.moveitService.draggableTopRatio);
      }
    });
  }

  ngOnDestroy() {
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
        // MOVE LISTENER
        return this.move$.pipe(
          map(mmEvent => {
            const mmPos: IPosition = this.onMouseMove(mmEvent);
            return {
              x: mmPos.x - mdPos.x,
              y: mmPos.y - mdPos.y,
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

  onMouseDown(mdEvent: MouseEvent | TouchEvent): IPosition {
    // Disable native behavior of some elements inside the draggable element (ex: images)
    this.moveitService.draggable.style.pointerEvents = 'none';
    // Special class to disable text hightlighting
    document.body.classList.add('no-select', 'dragging');
    // Emit draggable start position
    const startPos: IDraggable = {
      item: this.moveitService.draggable,
      initX: this.moveitService.draggableDimensions.left,
      initY: this.moveitService.draggableDimensions.top,
      offsetX: this.moveitService.getOffsetX(),
      offsetY: this.moveitService.getOffsetY()
    };
    this.mDragStart.emit(startPos);
    // Get pointer start position and return it
    const mdX = mdEvent instanceof MouseEvent ? mdEvent.pageX : mdEvent.touches[0].pageX;
    const mdY = mdEvent instanceof MouseEvent ? mdEvent.pageY : mdEvent.touches[0].pageY;
    const startX = mdX - startPos.offsetX;
    const startY = mdY - startPos.offsetY + this.bounds.scrollTop;
    return {
      x: startX,
      y: startY
    };
  }

  onMouseMove(mmEvent: MouseEvent | TouchEvent): IPosition {
    // Get mouse / touch position
    const mmX = mmEvent instanceof MouseEvent ? mmEvent.pageX : mmEvent.touches[0].pageX;
    const mmY = mmEvent instanceof MouseEvent ? mmEvent.pageY : mmEvent.touches[0].pageY;
    // Return position
    return {
      x: mmX,
      y: mmY + this.bounds.scrollTop,
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
    // Emit position
    const finalPos: IDraggable = {
      item: this.moveitService.draggable,
      initX: this.moveitService.draggableDimensions.left,
      initY: this.moveitService.draggableDimensions.top,
      offsetX: this.moveitService.getOffsetX() + shadowOffsetX,
      offsetY: this.moveitService.getOffsetY() + shadowOffsetY
    };

    const translateX = 'translateX(' + finalPos.offsetX + 'px) ';
    const translateY = 'translateY(' + finalPos.offsetY + 'px)';
    this.moveitService.draggable.style.transform = translateX + translateY;
    this.mDragStop.emit(finalPos);

    // This is for window resize
    this.moveitService.draggableLeftRatio = finalPos.offsetX / this.moveitService.containerDimensions.width;
    this.moveitService.draggableTopRatio = finalPos.offsetY / this.moveitService.containerDimensions.height;
  }

  move(leftPos: number, topPos: number): void {
    const movingPos: IDraggable = this.moveitService.move(leftPos, topPos, this.columnWidth);

    // Emit position
    this.mDragMove.emit(movingPos);
  }

  ngOnChanges(changes: SimpleChanges) {
    // new pages added to dashboard or dezoomed dashboard
    if (changes['dashboardDimensionsChanged'] && !changes['dashboardDimensionsChanged'].firstChange) {
      this.moveitService.getContainerDimensions(this.bounds);
      this.moveitService.initDraggableDimensions();
      this.moveitService.getBounds();
      this.moveitService.draggableLeftRatio =
        this.moveitService.getOffsetX() / this.moveitService.containerDimensions.width;
      this.moveitService.draggableTopRatio =
        this.moveitService.getOffsetY() / this.moveitService.containerDimensions.height;
    }

    if (changes['draggableFrom'] && !changes['draggableFrom'].firstChange) {
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
