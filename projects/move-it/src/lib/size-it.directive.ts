import { Directive, Input, AfterViewInit, Output, EventEmitter } from '@angular/core';
import { MoveItService } from './move-it.service';
import { Observable, fromEvent } from 'rxjs';
import { mergeMap, map, takeUntil, tap } from 'rxjs/operators';
import { MousePosition, ResizableDimensions } from './move-it-types';

@Directive({
  selector: '[ngSizeit]'
})
export class SizeItDirective implements AfterViewInit {

  @Input() bounds: HTMLElement = document.body;
  @Input() columnWidth = 1; // px
  @Input() minWidth = 1; // columns
  @Input() minHeight = 1; // columns

  // Event observables
  mousedown$: Observable<MouseEvent>;
  mousemove$: Observable<MouseEvent>;
  mouseup$: Observable<MouseEvent>;
  resize$: Observable<any>;

  // Emitted events
  @Output() mResizeStart: EventEmitter<ResizableDimensions> = new EventEmitter<ResizableDimensions>();
  @Output() mResizeMove: EventEmitter<ResizableDimensions> = new EventEmitter<ResizableDimensions>();
  @Output() mResizeStop: EventEmitter<ResizableDimensions> = new EventEmitter<ResizableDimensions>();

  constructor(
    private moveitService: MoveItService,
  ) { }

  ngAfterViewInit() {
    this.moveitService.resizeHandle = this.moveitService.draggable.querySelector('.resize-handle');

    // Create event listeners
    this.mousedown$ = fromEvent(this.moveitService.resizeHandle, 'mousedown') as Observable<MouseEvent>;
    this.mousemove$ = fromEvent(document, 'mousemove') as Observable<MouseEvent>;
    this.mouseup$ = fromEvent(document, 'mouseup') as Observable<MouseEvent>;

    this.resize$ = this.mousedown$.pipe(
      mergeMap(mdEvent => {
        const mdPos: MousePosition = this.onMouseDown(mdEvent);
        return this.mousemove$.pipe(
          map(mmEvent => {
            const mmPos: MousePosition = this.onMouseMove(mmEvent);
            return {
              initWidth: mdPos.w,
              initHeight: mdPos.h,
              x: mmPos.left,
              y: mmPos.top,
            };
          }),
          takeUntil(this.mouseup$.pipe(
            tap(() => this.onMouseUp())
          ))
        );
      }),
    );

    this.resize$.subscribe(pos => {
      this.resize(pos);
    });

  }

  onMouseDown(mdEvent: MouseEvent | TouchEvent): MousePosition {
    document.body.classList.add('no-select', 'resizing');
    const width = parseInt(this.moveitService.draggable.style.width, 10);
    const height = parseInt(this.moveitService.draggable.style.height, 10);
    this.moveitService.draggable.classList.add('moving');

    // Shadow div
    const shadowElt = document.createElement('div');
    shadowElt.setAttribute('class', 'draggable resize-shadow');
    shadowElt.style.transform = this.moveitService.draggable.style.transform;
    shadowElt.style.width = this.moveitService.draggable.style.width;
    shadowElt.style.height = this.moveitService.draggable.style.height;
    this.bounds.appendChild(shadowElt);

    const startDim: ResizableDimensions = {
      item: this.moveitService.draggable,
      width: width,
      height: height,
    };
    this.mResizeStart.emit(startDim);

    const mdClientX = mdEvent instanceof MouseEvent ? mdEvent.clientX : mdEvent.touches[0].clientX;
    const mdClientY = mdEvent instanceof MouseEvent ? mdEvent.clientY : mdEvent.touches[0].clientY;
    const startX = mdClientX;
    const startY = mdClientY + this.bounds.scrollTop;
    return {
      left: startX,
      top: startY,
      w: width,
      h: height
    };
  }

  onMouseMove(mmEvent: MouseEvent | TouchEvent): MousePosition {
    const mmClientX = mmEvent instanceof MouseEvent ? mmEvent.clientX : mmEvent.touches[0].clientX;
    const mmClientY = mmEvent instanceof MouseEvent ? mmEvent.clientY : mmEvent.touches[0].clientY;
    return {
      left: mmClientX - this.moveitService.containerDimensions.left - this.moveitService.draggableDimensions.left,
      top: mmClientY - this.moveitService.containerDimensions.top + this.bounds.scrollTop - this.moveitService.draggableDimensions.top
    };
  }

  onMouseUp(): void {
    this.moveitService.clearSelection();
    document.body.classList.remove('no-select', 'resizing');
    this.moveitService.draggable.classList.remove('moving');
    this.moveitService.initDraggableDimensions();
    this.moveitService.getBounds();

    // Get shadow style
    const shadowElt = this.bounds.querySelector('.resize-shadow') as HTMLElement;
    const width = parseFloat(shadowElt.style.width);
    const height = parseFloat(shadowElt.style.height);

    // Copy width and height to element
    this.moveitService.draggable.style.width = width + 'px';
    this.moveitService.draggable.style.height = height + 'px';

    const finalDim: ResizableDimensions = {
      item: this.moveitService.draggable,
      width: width,
      height: height,
    };
    this.mResizeStop.emit(finalDim);

    // Remove shadow
    this.bounds.removeChild(shadowElt);
  }

  resize(pos): void {
    const checkedDim = this.moveitService.checkResizeBounds(pos.x, pos.y, this.columnWidth, this.minWidth, this.minHeight);
    const movingDim: ResizableDimensions = {
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

}
