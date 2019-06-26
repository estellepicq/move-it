import { Directive, Input, AfterViewInit, Output, EventEmitter, OnDestroy } from '@angular/core';
import { MoveItService } from './move-it.service';
import { Observable, fromEvent, Subscription, merge, Subject } from 'rxjs';
import { mergeMap, map, takeUntil, tap, filter } from 'rxjs/operators';
import { IPosition } from './move-it-types';

@Directive({
  selector: '[ngSizeit]'
})
export class SizeItDirective implements AfterViewInit, OnDestroy {

  @Input() bounds: HTMLElement = document.body;
  @Input() columnWidth = 1; // px
  @Input() minWidth = 1; // columns
  @Input() minHeight = 1; // columns
  @Input() scale = 1;
  @Input() scrollableContainer: HTMLElement = document.body;
  @Input() handles: string[] = ['se', 's', 'sw', 'e', 'w', 'ne', 'n', 'nw'];

  // Event observables
  mousemove$: Observable<MouseEvent>;
  mouseup$: Observable<MouseEvent>;
  touchmove$: Observable<TouchEvent>;
  touchend$: Observable<TouchEvent>;
  touchcancel$: Observable<TouchEvent>;
  move$: Observable<MouseEvent | TouchEvent>;
  stop$: Observable<MouseEvent | TouchEvent>;
  resize$: Observable<IPosition>;
  resizeSub: Subscription;
  startSubject$ = new Subject<{event: MouseEvent|TouchEvent, el: HTMLElement}>();

  // Emitted events
  @Output() mResizeStart: EventEmitter<IPosition> = new EventEmitter<IPosition>();
  @Output() mResizeMove: EventEmitter<IPosition> = new EventEmitter<IPosition>();
  @Output() mResizeStop: EventEmitter<IPosition> = new EventEmitter<IPosition>();

  constructor(
    private moveitService: MoveItService,
  ) { }

  ngAfterViewInit() {
    // Create handles
    const resizeHandles = this.createHandles();

    // Create event listeners
    resizeHandles.forEach((resizeHandle) => {
      resizeHandle.addEventListener('mousedown', (event) => this.startSubject$.next({event, el: resizeHandle}));
      resizeHandle.addEventListener('touchstart', (event) => this.startSubject$.next({event, el: resizeHandle}), {passive: true});
    });

    this.mousemove$ = fromEvent(document, 'mousemove') as Observable<MouseEvent>;
    this.mouseup$ = fromEvent(document, 'mouseup') as Observable<MouseEvent>;
    this.touchmove$ = fromEvent(document, 'touchmove') as Observable<TouchEvent>;
    this.touchend$ = fromEvent(document, 'touchend') as Observable<TouchEvent>;
    this.touchcancel$ = fromEvent(document, 'touchcancel') as Observable<TouchEvent>;
    this.move$ = merge(this.mousemove$, this.touchmove$);
    this.stop$ = merge(this.mouseup$, this.touchend$, this.touchcancel$);

    this.resize$ = this.startSubject$.pipe(
      filter(res => res.event instanceof MouseEvent && res.event.button === 0 || res.event instanceof TouchEvent),
      mergeMap((res) => {
        // Get initial position
        const mdPos: IPosition = this.onMouseDown();

        // Then listen to mousemove
        return this.move$.pipe(
          map(mmEvent => {
            // Get mouse position
            const mmClientX = mmEvent instanceof MouseEvent ? mmEvent.clientX : mmEvent.touches[0].clientX;
            const mmClientY = mmEvent instanceof MouseEvent ? mmEvent.clientY : mmEvent.touches[0].clientY;
            const movingX = mmClientX - this.moveitService.containerDimensions.left + this.scrollableContainer.scrollLeft - this.moveitService.draggableDimensions.left;
            const movingY = mmClientY - this.moveitService.containerDimensions.top + this.scrollableContainer.scrollTop - this.moveitService.draggableDimensions.top;

            // Build pos object
            const pos: IPosition = {
              resizeHandle: res.el.id,
              x: movingX,
              y: movingY,
              w: mdPos.w,
              h: mdPos.h,
              initX: mdPos.x,
              initY: mdPos.y,
              shadow: mdPos.shadow
            };
            return pos; // This observable is listened in "resizeSub"
          }),

          // Stop listening on mouseup
          takeUntil(this.stop$.pipe(
            tap(() => this.onMouseUp(mdPos.shadow))
          ))
        );
      }),
    );

    this.resizeSub = this.resize$.subscribe(pos => {
      this.resize(pos);
    });

  }

  onMouseDown(): IPosition {
    // Add "no-select" and "resizing" class to body
    document.body.classList.add('no-select', 'resizing');

    // Get init width and height
    const initW = this.moveitService.draggable.style.width !== '' ? parseInt(this.moveitService.draggable.style.width, 10) : this.moveitService.draggableDimensions.width;
    const initH = this.moveitService.draggable.style.height !== '' ? parseInt(this.moveitService.draggable.style.height, 10) : this.moveitService.draggableDimensions.height;

    // Get init offsetX and offsetY
    const initX = this.moveitService.getOffsetX();
    const initY = this.moveitService.getOffsetY();

    // SHADOW
    const draggableStyle = window.getComputedStyle(this.moveitService.draggable);
    const shadowElt = document.createElement('div');
    // Apply draggable styles
    shadowElt.style.transform = draggableStyle.transform;
    shadowElt.style.top = draggableStyle.top;
    shadowElt.style.left = draggableStyle.left;
    shadowElt.style.width = draggableStyle.width;
    shadowElt.style.height = draggableStyle.height;
    // Add a resize-shadow class
    shadowElt.setAttribute('class', 'draggable resize-shadow');
    this.bounds.appendChild(shadowElt);

    // Build start dimensions object
    const startDim: IPosition = {
      item: this.moveitService.draggable,
      w: initW,
      h: initH,
      x: initX,
      y: initY,
      shadow: shadowElt
    };
    this.mResizeStart.emit(startDim);

    return startDim;
  }

  onMouseUp(shadow: HTMLElement): void {
    this.moveitService.clearSelection();
    document.body.classList.remove('no-select', 'resizing');
    // Reset dimensions
    this.moveitService.initDraggableDimensions();
    this.moveitService.getBounds();

    // Copy shadow styles to element
    this.moveitService.draggable.style.width = shadow.style.width;
    this.moveitService.draggable.style.height = shadow.style.height;
    this.moveitService.draggable.style.transform = shadow.style.transform;

    // Build final dimensions object
    const finalDim: IPosition = {
      item: this.moveitService.draggable,
      w: parseInt(shadow.style.width, 10),
      h: parseInt(shadow.style.height, 10),
      x: this.moveitService.getOffsetX(),
      y: this.moveitService.getOffsetY()
    };
    this.mResizeStop.emit(finalDim);

    // Remove shadow
    this.bounds.removeChild(shadow);
  }

  resize(pos: IPosition) {
    const changeTop = pos.resizeHandle === 'resize-handle-ne' || pos.resizeHandle === 'resize-handle-n' || pos.resizeHandle === 'resize-handle-nw';
    const changeLeft = pos.resizeHandle === 'resize-handle-nw' || pos.resizeHandle === 'resize-handle-w' || pos.resizeHandle === 'resize-handle-sw';
    const changeRight = pos.resizeHandle === 'resize-handle-e' || pos.resizeHandle === 'resize-handle-se' || pos.resizeHandle === 'resize-handle-ne';
    const changeBottom = pos.resizeHandle === 'resize-handle-se' || pos.resizeHandle === 'resize-handle-s' || pos.resizeHandle === 'resize-handle-sw';

    // snap to grid
    let snappedX = Math.round(pos.x / this.columnWidth) * this.columnWidth;
    let snappedY = Math.round(pos.y / this.columnWidth) * this.columnWidth;

    // min width
    if (changeRight && snappedX < this.minWidth + pos.initX) {
      snappedX = this.minWidth + pos.initX;
    }
    if (changeLeft && snappedX > pos.w - this.minWidth + pos.initX) {
      snappedX = pos.w - this.minWidth + pos.initX;
    }
    // min height
    if (changeBottom && snappedY < this.minHeight + pos.initY) {
      snappedY = this.minHeight + pos.initY;
    }
    if (changeTop && snappedY > pos.h - this.minHeight + pos.initY) {
      snappedY = pos.h - this.minHeight + pos.initY;
    }

    let snappedTranslateX: number = changeLeft ? snappedX : pos.initX;
    let snappedTranslateY: number = changeTop ? snappedY : pos.initY;
    const freeTranslateX: number = changeLeft ? pos.x : pos.initX;
    const freeTranslateY: number = changeTop ? pos.y : pos.initY;
    // left bound
    if (this.moveitService.draggableDimensions.left + snappedX < 0) {
      snappedX = -(this.moveitService.draggableDimensions.left);
      snappedTranslateX = snappedX;
    }
    // top bound
    if (this.moveitService.draggableDimensions.top + snappedY < 0) {
      snappedY = -(this.moveitService.draggableDimensions.top);
      snappedTranslateY = snappedY;
    }
    // right bound
    if (snappedX > this.moveitService.containerDimensions.width - this.moveitService.draggableDimensions.left) {
      snappedX = this.moveitService.containerDimensions.width - this.moveitService.draggableDimensions.left;
    }
    // bottom bound
    if (snappedY > this.moveitService.containerDimensions.height - this.moveitService.draggableDimensions.top) {
      snappedY = this.moveitService.containerDimensions.height - this.moveitService.draggableDimensions.top;
    }

    // Handle width and height
    let snappedWidth: number = pos.w;
    let snappedHeight: number = pos.h;
    let freeWidth: number = pos.w;
    let freeHeight: number = pos.h;
    if (changeBottom && !changeRight) {
      snappedHeight = snappedY - pos.initY;
      freeHeight = pos.y - pos.initY;
      if (changeLeft) {
        snappedWidth = pos.w - snappedX + pos.initX;
        freeWidth = pos.w - pos.x + pos.initX;
      }
    }
    if (changeRight && !changeBottom) {
      snappedWidth = snappedX - pos.initX;
      freeWidth = pos.x - pos.initX;
      if (changeTop) {
        snappedHeight = pos.h - snappedY + pos.initY;
        freeHeight = pos.h - pos.y + pos.initY;
      }
    }
    if (changeRight && changeBottom) {
      snappedWidth = snappedX - pos.initX;
      snappedHeight = snappedY - pos.initY;
      freeWidth = pos.x - pos.initX;
      freeHeight = pos.y - pos.initY;
    }
    if (changeLeft && !changeTop) {
      snappedWidth = pos.w - snappedX + pos.initX;
      freeWidth = pos.w - pos.x + pos.initX;
    }
    if (changeTop && !changeLeft) {
      snappedHeight = pos.h - snappedY + pos.initY;
      freeHeight = pos.h - pos.y + pos.initY;
    }
    if (changeTop && changeLeft) {
      snappedWidth = pos.w - snappedX + pos.initX;
      snappedHeight = pos.h - snappedY + pos.initY;
      freeWidth = pos.w - pos.x + pos.initX;
      freeHeight = pos.h - pos.y + pos.initY;
    }

    // Apply snap-on-grid style to shadow element
    pos.shadow.style.height = snappedHeight + 'px';
    pos.shadow.style.width = snappedWidth + 'px';
    pos.shadow.style.transform = 'translateX(' + snappedTranslateX + 'px) translateY(' + snappedTranslateY + 'px)';

    // Apply free-style to draggable element
    this.moveitService.draggable.style.height = freeHeight + 'px';
    this.moveitService.draggable.style.width = freeWidth + 'px';
    this.moveitService.draggable.style.transform = 'translateX(' + freeTranslateX + 'px) translateY(' + freeTranslateY + 'px)';

    const movingDim: IPosition = {
      item: this.moveitService.draggable,
      w: snappedWidth,
      h: snappedHeight,
      x: snappedTranslateX,
      y: snappedTranslateY
    };
    this.mResizeMove.emit(movingDim);
  }

  ngOnDestroy() {
    this.resizeSub.unsubscribe();
  }

  createHandles(): HTMLElement[] {
    const handles: HTMLElement[] = [];
    this.handles.forEach(handle => {
      if (!handle.match(/^(se|sw|ne|nw|n|e|s|w)$/)) {
        console.error('Invalid handle:', handle);
        return null;
      }
      const resizeHandle = document.createElement('div');
      resizeHandle.setAttribute('id', 'resize-handle-' + handle);
      resizeHandle.setAttribute('class', 'resize-handle resize-handle-' + handle);
      this.moveitService.draggable.appendChild(resizeHandle);
      handles.push(resizeHandle);
    });
    return handles;
  }

}
