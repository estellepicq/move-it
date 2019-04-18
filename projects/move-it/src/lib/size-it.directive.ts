import { Directive, Input, AfterViewInit, Output, EventEmitter, OnDestroy } from '@angular/core';
import { MoveItService } from './move-it.service';
import { Observable, fromEvent, Subscription, merge, of, Subject } from 'rxjs';
import { mergeMap, map, takeUntil, tap, filter, concat } from 'rxjs/operators';
import { IResizable, IPosition } from './move-it-types';

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
  @Output() mResizeStart: EventEmitter<IResizable> = new EventEmitter<IResizable>();
  @Output() mResizeMove: EventEmitter<IResizable> = new EventEmitter<IResizable>();
  @Output() mResizeStop: EventEmitter<IResizable> = new EventEmitter<IResizable>();

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
        const mdPos: IPosition = this.onMouseDown();
        return this.move$.pipe(
          map(mmEvent => {
            const mmPos: IPosition = this.onMouseMove(mmEvent);
            return {
              w: mdPos.w,
              h: mdPos.h,
              x: mmPos.x,
              y: mmPos.y,
              handle: res.el.id,
              offsetX: mdPos.x,
              offsetY: mdPos.y,
            };
          }),
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
    document.body.classList.add('no-select', 'resizing');
    const width = this.moveitService.draggable.style.width !== '' ?
      parseInt(this.moveitService.draggable.style.width, 10) :
      this.moveitService.draggableDimensions.width;
    const height = this.moveitService.draggable.style.height !== '' ?
      parseInt(this.moveitService.draggable.style.height, 10) :
      this.moveitService.draggableDimensions.height;

    const startDim: IResizable = {
      item: this.moveitService.draggable,
      width: width,
      height: height,
      offsetX: this.moveitService.getOffsetX(),
      offsetY: this.moveitService.getOffsetY()
    };
    this.mResizeStart.emit(startDim);

    return {
      x: startDim.offsetX,
      y: startDim.offsetY,
      w: startDim.width,
      h: startDim.height
    };
  }

  onMouseMove(mmEvent: MouseEvent | TouchEvent): IPosition {
    const mmClientX = mmEvent instanceof MouseEvent ? mmEvent.clientX : mmEvent.touches[0].clientX;
    const mmClientY = mmEvent instanceof MouseEvent ? mmEvent.clientY : mmEvent.touches[0].clientY;
    return {
      x: mmClientX - this.moveitService.containerDimensions.left - this.moveitService.draggableDimensions.left,
      y: mmClientY - this.moveitService.containerDimensions.top + this.bounds.scrollTop - this.moveitService.draggableDimensions.top
    };
  }

  onMouseUp(): void {
    this.moveitService.clearSelection();
    document.body.classList.remove('no-select', 'resizing');
    this.moveitService.initDraggableDimensions();
    this.moveitService.getBounds();

    const finalDim: IResizable = {
      item: this.moveitService.draggable,
      width: parseInt(this.moveitService.draggable.style.width, 10),
      height: parseInt(this.moveitService.draggable.style.height, 10),
      offsetX: this.moveitService.getOffsetX(),
      offsetY: this.moveitService.getOffsetY()
    };
    this.mResizeStop.emit(finalDim);
  }

  resize(pos: IPosition) {
    const changeTop = pos.handle === 'resize-handle-ne' || pos.handle === 'resize-handle-n' || pos.handle === 'resize-handle-nw';
    const changeLeft = pos.handle === 'resize-handle-nw' || pos.handle === 'resize-handle-w' || pos.handle === 'resize-handle-sw';
    const changeRight = pos.handle === 'resize-handle-e' || pos.handle === 'resize-handle-se' || pos.handle === 'resize-handle-ne';
    const changeBottom = pos.handle === 'resize-handle-se' || pos.handle === 'resize-handle-s' || pos.handle === 'resize-handle-sw';

    // snap to grid
    pos.x = Math.round(pos.x / this.columnWidth) * this.columnWidth;
    pos.y = Math.round(pos.y / this.columnWidth) * this.columnWidth;

    // min width
    if (changeRight && pos.x < this.minWidth + pos.offsetX) {
      pos.x = this.minWidth + pos.offsetX;
    }
    if (changeLeft && pos.x > pos.w - this.minWidth + pos.offsetX) {
      pos.x = pos.w - this.minWidth + pos.offsetX;
    }
    // min height
    if (changeBottom && pos.y < this.minHeight + pos.offsetY) {
      pos.y = this.minHeight + pos.offsetY;
    }
    if (changeTop && pos.y > pos.h - this.minHeight + pos.offsetY) {
      pos.y = pos.h - this.minHeight + pos.offsetY;
    }

    let translateX: number = changeLeft ? pos.x : pos.offsetX;
    let translateY: number = changeTop ? pos.y : + pos.offsetY;
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
      newHeight = pos.y - pos.offsetY;
      if (changeLeft) {
        newWidth = pos.w - pos.x + pos.offsetX;
      }
    }
    if (changeRight && !changeBottom) {
      newWidth = pos.x - pos.offsetX;
      if (changeTop) {
        newHeight = pos.h - pos.y + pos.offsetY;
      }
    }
    if (changeRight && changeBottom) {
      newWidth = pos.x - pos.offsetX;
      newHeight = pos.y - pos.offsetY;
    }
    if (changeLeft && !changeTop) {
      newWidth =  pos.w - pos.x + pos.offsetX;
    }
    if (changeTop && !changeLeft) {
      newHeight =  pos.h - pos.y + pos.offsetY;
    }
    if (changeTop && changeLeft) {
      newWidth =  pos.w - pos.x + pos.offsetX;
      newHeight =  pos.h - pos.y + pos.offsetY;
    }
    this.moveitService.draggable.style.height = newHeight + 'px';
    this.moveitService.draggable.style.width = newWidth + 'px';

    const movingDim: IResizable = {
      item: this.moveitService.draggable,
      width: newWidth,
      height: newHeight,
      offsetX: translateX,
      offsetY: translateY
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
