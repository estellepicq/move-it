import { Directive, Input, AfterViewInit, Output, EventEmitter, OnDestroy } from '@angular/core';
import { MoveItService } from './move-it.service';
import { Observable, fromEvent, Subscription, merge, of } from 'rxjs';
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
  @Input() handles: string[] = ['se'];

  // Event observables
  mousedown$: Observable<MouseEvent> = of();
  mousemove$: Observable<MouseEvent>;
  mouseup$: Observable<MouseEvent>;
  touchstart$: Observable<TouchEvent> = of();
  touchmove$: Observable<TouchEvent>;
  touchend$: Observable<TouchEvent>;
  touchcancel$: Observable<TouchEvent>;
  start$: Observable<MouseEvent | TouchEvent>;
  move$: Observable<MouseEvent | TouchEvent>;
  stop$: Observable<MouseEvent | TouchEvent>;
  resize$: Observable<IPosition>;
  resizeSub: Subscription;

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
    // const resizeHandle = document.createElement('div');
    // resizeHandle.setAttribute('class', 'resize-handle');
    // this.moveitService.draggable.appendChild(resizeHandle);

    // Add options to resize handles

    // Create event listeners
    resizeHandles.forEach(resizeHandle => {
      this.mousedown$ = merge(this.mousedown$, fromEvent(resizeHandle, 'mousedown') as Observable<MouseEvent>);
      this.touchstart$ = merge(this.touchstart$, fromEvent(resizeHandle, 'touchstart') as Observable<TouchEvent>);
    });
    // this.mousedown$ = fromEvent(resizeHandle, 'mousedown') as Observable<MouseEvent>;
    this.mousemove$ = fromEvent(document, 'mousemove') as Observable<MouseEvent>;
    this.mouseup$ = fromEvent(document, 'mouseup') as Observable<MouseEvent>;
    // this.touchstart$ = fromEvent(resizeHandle, 'touchstart', { passive: true }) as Observable<TouchEvent>;
    this.touchmove$ = fromEvent(document, 'touchmove') as Observable<TouchEvent>;
    this.touchend$ = fromEvent(document, 'touchend') as Observable<TouchEvent>;
    this.touchcancel$ = fromEvent(document, 'touchcancel') as Observable<TouchEvent>;
    this.start$ = merge(this.mousedown$, this.touchstart$);
    this.move$ = merge(this.mousemove$, this.touchmove$);
    this.stop$ = merge(this.mouseup$, this.touchend$, this.touchcancel$);

    this.resize$ = this.start$.pipe(
      filter(mdEvent => mdEvent instanceof MouseEvent && mdEvent.button === 0 || mdEvent instanceof TouchEvent),
      mergeMap((mdEvent) => {
        console.log(mdEvent);
        const mdPos: IPosition = this.onMouseDown();
        return this.move$.pipe(
          map(mmEvent => {
            const mmPos: IPosition = this.onMouseMove(mmEvent);
            return {
              w: mdPos.w,
              h: mdPos.h,
              x: mmPos.x,
              y: mmPos.y,
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
    const width = parseInt(this.moveitService.draggable.style.width, 10);
    const height = parseInt(this.moveitService.draggable.style.height, 10);

    // Shadow div
    const shadowElt = document.createElement('div');
    shadowElt.setAttribute('class', 'draggable resize-shadow');
    shadowElt.style.transform = this.moveitService.draggable.style.transform;
    shadowElt.style.width = this.moveitService.draggable.style.width;
    shadowElt.style.height = this.moveitService.draggable.style.height;
    this.bounds.appendChild(shadowElt);

    const startDim: IResizable = {
      item: this.moveitService.draggable,
      width: width,
      height: height,
    };
    this.mResizeStart.emit(startDim);

    return {
      w: width,
      h: height
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

    // Get shadow style
    const shadowElt = this.bounds.querySelector('.resize-shadow') as HTMLElement;
    const width = parseFloat(shadowElt.style.width);
    const height = parseFloat(shadowElt.style.height);

    // Copy width and height to element
    this.moveitService.draggable.style.width = width + 'px';
    this.moveitService.draggable.style.height = height + 'px';

    const finalDim: IResizable = {
      item: this.moveitService.draggable,
      width: width,
      height: height,
    };
    this.mResizeStop.emit(finalDim);

    // Remove shadow
    this.bounds.removeChild(shadowElt);
  }

  resize(pos: IPosition): void {
    const checkedDim = this.moveitService.checkResizeBounds(pos.x, pos.y, this.columnWidth, this.minWidth, this.minHeight);
    const movingDim: IResizable = {
      item: this.moveitService.draggable,
      width: checkedDim.x,
      height: checkedDim.y
    };
    this.mResizeMove.emit(movingDim);

    // Shadow snapped on grid
    const shadowElt = this.bounds.querySelector('.resize-shadow') as HTMLElement;
    shadowElt.style.width = movingDim.width + 'px';
    shadowElt.style.height = movingDim.height + 'px';

    // Update element style
    this.moveitService.draggable.style.width = pos.x - this.moveitService.getOffsetX() + 'px';
    this.moveitService.draggable.style.height = pos.y - this.moveitService.getOffsetY() + 'px';
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
      resizeHandle.setAttribute('class', 'resize-handle-' + handle);
      this.moveitService.draggable.appendChild(resizeHandle);
      handles.push(resizeHandle);
    });
    return handles;
  }

}

// if (this._direction.n) {
//   // n, ne, nw
//   this._currPos.y = this._origPos.y + tmpY;
//   this._currSize.height = this._origSize.height - tmpY;
// } else if (this._direction.s) {
//   // s, se, sw
//   this._currSize.height = this._origSize.height + tmpY;
// }

// if (this._direction.e) {
//   // e, ne, se
//   this._currSize.width = this._origSize.width + tmpX;
// } else if (this._direction.w) {
//   // w, nw, sw
//   this._currSize.width = this._origSize.width - tmpX;
//   this._currPos.x = this._origPos.x + tmpX;
// }
