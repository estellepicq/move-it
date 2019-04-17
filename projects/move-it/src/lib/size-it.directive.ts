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
  // mousedown$: Observable<MouseEvent> = of();
  mousemove$: Observable<MouseEvent>;
  mouseup$: Observable<MouseEvent>;
  // touchstart$: Observable<TouchEvent> = of();
  touchmove$: Observable<TouchEvent>;
  touchend$: Observable<TouchEvent>;
  touchcancel$: Observable<TouchEvent>;
  // start$: Observable<MouseEvent | TouchEvent>;
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
    // const resizeHandle = document.createElement('div');
    // resizeHandle.setAttribute('class', 'resize-handle');
    // this.moveitService.draggable.appendChild(resizeHandle);

    // Add options to resize handles

    // Create event listeners
    resizeHandles.forEach((resizeHandle) => {
      resizeHandle.addEventListener('mousedown', (event) => this.startSubject$.next({event, el: resizeHandle}));
      resizeHandle.addEventListener('touchstart', (event) => this.startSubject$.next({event, el: resizeHandle}), {passive: true});
    });

    // this.mousedown$ = fromEvent(resizeHandles[0], 'mousedown') as Observable<MouseEvent>;
    this.mousemove$ = fromEvent(document, 'mousemove') as Observable<MouseEvent>;
    this.mouseup$ = fromEvent(document, 'mouseup') as Observable<MouseEvent>;
    // this.touchstart$ = fromEvent(resizeHandles[0], 'touchstart', { passive: true }) as Observable<TouchEvent>;
    this.touchmove$ = fromEvent(document, 'touchmove') as Observable<TouchEvent>;
    this.touchend$ = fromEvent(document, 'touchend') as Observable<TouchEvent>;
    this.touchcancel$ = fromEvent(document, 'touchcancel') as Observable<TouchEvent>;
    // this.start$ = merge(this.mousedown$, this.touchstart$);
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
    const height = this.moveitService.draggable.style.width !== '' ?
      parseInt(this.moveitService.draggable.style.height, 10) :
      this.moveitService.draggableDimensions.height;

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

    // Get pointer start position and return it
    const offsetX = this.moveitService.getOffsetX();
    const offsetY = this.moveitService.getOffsetY();

    return {
      x: offsetX,
      y: offsetY,
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
    // new
    const shadowOffset = this.moveitService.draggable.style.filter.match(/[-]{0,1}[\d]*[\.]{0,1}[\d]+/g);
    const shadowOffsetX = shadowOffset ? parseFloat(shadowOffset[4]) : 0;
    const shadowOffsetY = shadowOffset ? parseFloat(shadowOffset[5]) : 0;

    // Copy width and height to element
    this.moveitService.draggable.style.width = width - shadowOffsetX + 'px';
    this.moveitService.draggable.style.height = height - shadowOffsetY + 'px';
    // new
    const newTranlateX = this.moveitService.getOffsetX() + shadowOffsetX;
    const newTranlateY =  this.moveitService.getOffsetY() + shadowOffsetY;
    const translateX = 'translateX(' + newTranlateX + 'px) ';
    const translateY = 'translateY(' + newTranlateY + 'px)';
    this.moveitService.draggable.style.transform = translateX + translateY;
    this.moveitService.draggable.style.filter = 'unset';

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
    let x = pos.x;
    let y = pos.y;
    switch (pos.handle) {
      case 'resize-handle-se':
        // default case
        break;
      case 'resize-handle-s':
        x = pos.w + pos.offsetX; // unvariable width
        break;
      case 'resize-handle-sw':
        this.moveitService.move(x, pos.offsetY, this.columnWidth); // y coordinate does not change, x does
        x = pos.w + pos.offsetX; // width will be calculated making the difference between x and offsetX
        break;
      case 'resize-handle-ne':
        this.moveitService.move(pos.offsetX, y, this.columnWidth); // x coordinate does not change, y does
        y = pos.h + pos.offsetY; // height will be calculated making the difference between y and offsetY
        break;
      case 'resize-handle-n':
        this.moveitService.move(pos.offsetX, y, this.columnWidth);
        x = pos.w + pos.offsetX; // unvariable width
        y = pos.h + pos.offsetY; // height will be calculated making the difference between y and offsetY
        break;
      case 'resize-handle-nw':
        this.moveitService.move(x, y, this.columnWidth); // both x and y coordinates change
        x = pos.w + pos.offsetX;
        y = pos.h + pos.offsetY;
        break;
      case 'resize-handle-e':
        this.moveitService.move(x, pos.offsetY, this.columnWidth); // y coordinate does not change, x does
        x = pos.w + pos.offsetX; // width will be calculated making the difference between x and offsetX
        y = pos.h + pos.offsetY; // unvariable height
        break;
      case 'resize-handle-w':
        y = pos.h + pos.offsetY; // unvariable height
        break;
    }
    const checkedDim = this.moveitService.checkResizeBounds(x, y, this.columnWidth, this.minWidth, this.minHeight);

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

    // Update element style: if element has an offset, remove it so that the element can grow
    this.moveitService.draggable.style.width = x - this.moveitService.getOffsetX() + 'px';
    this.moveitService.draggable.style.height = y - this.moveitService.getOffsetY() + 'px';
    // this.moveitService.draggable.style.width = x + 'px';
    // this.moveitService.draggable.style.height = y + 'px';
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
