import { Directive, Input, AfterViewInit, Output, EventEmitter } from '@angular/core';
import { DraggableService } from './draggable.service';
import { Observable, fromEvent } from 'rxjs';
import { mergeMap, map, takeUntil, tap } from 'rxjs/operators';
import { MousePosition, DimensionsPx, ResizableDimensions, ResizableMovingDimensions } from './draggable-types';

@Directive({
  selector: '[appResizable]'
})
export class ResizableDirective implements AfterViewInit {

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
    private draggableService: DraggableService,
  ) { }

  ngAfterViewInit() {
    this.draggableService.resizeHandle = this.draggableService.draggable.querySelector('.resize-handle');

    // Create event listeners
    this.mousedown$ = fromEvent(this.draggableService.resizeHandle, 'mousedown') as Observable<MouseEvent>;
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
    const width = parseInt(this.draggableService.draggable.style.width, 10);
    const height = parseInt(this.draggableService.draggable.style.height, 10);
    const startDim: ResizableDimensions = {
      item: this.draggableService.draggable,
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
      left: mmClientX - this.draggableService.containerDimensions.left,
      top: mmClientY - this.draggableService.containerDimensions.top + this.bounds.scrollTop
    };
  }

  onMouseUp(): void {
    this.draggableService.clearSelection();
    document.body.classList.remove('no-select', 'resizing');
    this.draggableService.initDraggableDimensions();
    this.draggableService.getBounds();
    const width = parseInt(this.draggableService.draggable.style.width, 10);
    const height = parseInt(this.draggableService.draggable.style.height, 10);
    const finalDim: ResizableDimensions = {
      item: this.draggableService.draggable,
      width: width,
      height: height,
    };
    this.mResizeStop.emit(finalDim);
  }

  resize(pos): void {
    const checkedDim = this.draggableService.checkResizeBounds(pos.x, pos.y, this.columnWidth, this.minWidth, this.minHeight);

    const movingDim: ResizableDimensions = {
      item: this.draggableService.draggable,
      width: checkedDim.x,
      height: checkedDim.y
    };
    this.mResizeMove.emit(movingDim);

    this.draggableService.draggable.style.width = checkedDim.x + 'px';
    this.draggableService.draggable.style.height = checkedDim.y + 'px';
  }

}
