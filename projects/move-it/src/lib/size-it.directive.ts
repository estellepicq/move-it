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
    // Create handle
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
            const movingX = mmClientX - this.moveitService.containerDimensions.left - this.moveitService.draggableDimensions.left;
            const movingY = mmClientY - this.moveitService.containerDimensions.top + this.bounds.scrollTop - this.moveitService.draggableDimensions.top;

            // Build pos object
            const pos: IPosition = {
              resizeHandle: res.el.id,
              x: movingX,
              y: movingY,
              w: mdPos.w,
              h: mdPos.h,
              initX: mdPos.x,
              initY: mdPos.y,
            };
            return pos; // This observable is listened in "resizeSub"
          }),

          // Stop listening on mouseup
          takeUntil(this.stop$.pipe(
            tap(() => this.onMouseUp())
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

    // Build start dimensions object
    const startDim: IPosition = {
      item: this.moveitService.draggable,
      w: initW,
      h: initH,
      x: initX,
      y: initY
    };
    this.mResizeStart.emit(startDim);

    return startDim;
  }

  onMouseUp(): void {
    this.moveitService.clearSelection();
    document.body.classList.remove('no-select', 'resizing');
    this.moveitService.initDraggableDimensions();
    this.moveitService.getBounds();

    const finalDim: IPosition = {
      item: this.moveitService.draggable,
      w: parseInt(this.moveitService.draggable.style.width, 10),
      h: parseInt(this.moveitService.draggable.style.height, 10),
      x: this.moveitService.getOffsetX(),
      y: this.moveitService.getOffsetY()
    };
    this.mResizeStop.emit(finalDim);
  }

  resize(pos: IPosition) {
    const changeTop = pos.resizeHandle === 'resize-handle-ne' || pos.resizeHandle === 'resize-handle-n' || pos.resizeHandle === 'resize-handle-nw';
    const changeLeft = pos.resizeHandle === 'resize-handle-nw' || pos.resizeHandle === 'resize-handle-w' || pos.resizeHandle === 'resize-handle-sw';
    const changeRight = pos.resizeHandle === 'resize-handle-e' || pos.resizeHandle === 'resize-handle-se' || pos.resizeHandle === 'resize-handle-ne';
    const changeBottom = pos.resizeHandle === 'resize-handle-se' || pos.resizeHandle === 'resize-handle-s' || pos.resizeHandle === 'resize-handle-sw';

    // snap to grid
    pos.x = Math.round(pos.x / this.columnWidth) * this.columnWidth;
    pos.y = Math.round(pos.y / this.columnWidth) * this.columnWidth;

    // min width
    if (changeRight && pos.x < this.minWidth + pos.initX) {
      pos.x = this.minWidth + pos.initX;
    }
    if (changeLeft && pos.x > pos.w - this.minWidth + pos.initX) {
      pos.x = pos.w - this.minWidth + pos.initX;
    }
    // min height
    if (changeBottom && pos.y < this.minHeight + pos.initY) {
      pos.y = this.minHeight + pos.initY;
    }
    if (changeTop && pos.y > pos.h - this.minHeight + pos.initY) {
      pos.y = pos.h - this.minHeight + pos.initY;
    }

    let translateX: number = changeLeft ? pos.x : pos.initX;
    let translateY: number = changeTop ? pos.y : + pos.initY;
    // left bound
    if (this.moveitService.draggableDimensions.left + pos.x < 0) {
      pos.x = -(this.moveitService.draggableDimensions.left);
      translateX = pos.x;
    }
    // top bound
    if (this.moveitService.draggableDimensions.top + pos.y < 0) {
      pos.y = -(this.moveitService.draggableDimensions.top);
      translateY = pos.y;
    }
    // right bound
    if (pos.x > this.moveitService.containerDimensions.width - this.moveitService.draggableDimensions.left) {
      pos.x = this.moveitService.containerDimensions.width - this.moveitService.draggableDimensions.left;
    }
    // bottom bound
    if (pos.y > this.moveitService.containerDimensions.height - this.moveitService.draggableDimensions.top) {
      pos.y = this.moveitService.containerDimensions.height - this.moveitService.draggableDimensions.top;
    }

    // translate
    this.moveitService.draggable.style.transform = 'translateX(' + translateX + 'px) translateY(' + translateY + 'px)';

    // Handle width and height
    let newWidth: number = pos.w;
    let newHeight: number = pos.h;
    if (changeBottom && !changeRight) {
      newHeight = pos.y - pos.initY;
      if (changeLeft) {
        newWidth = pos.w - pos.x + pos.initX;
      }
    }
    if (changeRight && !changeBottom) {
      newWidth = pos.x - pos.initX;
      if (changeTop) {
        newHeight = pos.h - pos.y + pos.initY;
      }
    }
    if (changeRight && changeBottom) {
      newWidth = pos.x - pos.initX;
      newHeight = pos.y - pos.initY;
    }
    if (changeLeft && !changeTop) {
      newWidth =  pos.w - pos.x + pos.initX;
    }
    if (changeTop && !changeLeft) {
      newHeight =  pos.h - pos.y + pos.initY;
    }
    if (changeTop && changeLeft) {
      newWidth =  pos.w - pos.x + pos.initX;
      newHeight =  pos.h - pos.y + pos.initY;
    }
    this.moveitService.draggable.style.height = newHeight + 'px';
    this.moveitService.draggable.style.width = newWidth + 'px';

    const movingDim: IPosition = {
      item: this.moveitService.draggable,
      w: newWidth,
      h: newHeight,
      x: translateX,
      y: translateY
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
