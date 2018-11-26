import { Directive, ElementRef, Input, OnInit } from '@angular/core';
import { Observable, fromEvent } from 'rxjs';
import { map, takeUntil, mergeMap, filter, tap } from 'rxjs/operators';

interface MousePosition {
  left: number;
  top: number;
}

interface PartialDomRect {
  width: number;
  height: number;
  left: number;
  top: number;
}

interface DraggablePosition {
  leftPos: number;
  topPos: number;
  left: boolean;
  right: boolean;
  top: boolean;
  bottom: boolean;
}

interface Bounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

@Directive({
  selector: '[appDraggable]'
})
export class DraggableDirective implements OnInit {

  @Input() draggableFrom: string;
  @Input() bounds: HTMLElement;
  @Input() columns;
  draggable: HTMLElement;
  handle: HTMLElement;
  draggableAbsolutePosition: boolean;

  // Draggable and container positions
  containerWidth: number;
  containerHeight: number;
  containerLeft: number;
  containerTop: number;
  draggableRect: any;
  draggableWidth: number;
  draggableHeight: number;
  // columnWidth: number;
  // initialGridOffsetX: number;

  // Event observables
  mousedown$: Observable<MouseEvent>;
  mousemove$: Observable<MouseEvent>;
  mouseup$: Observable<MouseEvent>;
  mousedrag$: Observable<MousePosition>;

  constructor(
    private el: ElementRef,
  ) { }

  ngOnInit() {
    // Find draggable element and disable html drag
    this.draggable = this.el.nativeElement;
    this.draggable.draggable = false;
    this.draggable.style.zIndex = '9999';
    this.draggable.setAttribute('moveit', 'true');

    // Is draggable position absolute
    const draggablePositionStyle = window.getComputedStyle(this.draggable).getPropertyValue('position');
    if (draggablePositionStyle === 'absolute'
      || draggablePositionStyle === 'fixed'
      || draggablePositionStyle === 'sticky'
      || draggablePositionStyle === 'relative') {
      this.draggableAbsolutePosition = true;
    }

    // Get container bounds
    const containerRect: PartialDomRect = this.getContainerRect(this.bounds);
    this.containerWidth = containerRect.width;
    this.containerHeight = containerRect.height;
    this.containerLeft = containerRect.left;
    this.containerTop = containerRect.top;
    // Get draggable bounds
    this.draggableRect = this.draggable.getBoundingClientRect();
    this.draggableWidth = this.draggableRect.width;
    this.draggableHeight = this.draggableRect.height;

    // Handle from a specific part of draggable element
    this.handle = this.draggable;
    if (this.draggableFrom) {
      this.handle = this.draggable.querySelector('#' + this.draggableFrom);
    }

    // Get grid & replace elements
    // if (this.columns) {
    //   this.columnWidth = Math.round(this.containerWidth / this.columns);
    //   this.initialGridOffsetX = this.getInitialGridOffset();
    //   this.replaceElementOnGrid();
    // }

    // Create event listeners
    this.mousedown$ = fromEvent(this.handle, 'mousedown') as Observable<MouseEvent>;
    this.mousemove$ = fromEvent(document, 'mousemove') as Observable<MouseEvent>;
    this.mouseup$ = fromEvent(document, 'mouseup') as Observable<MouseEvent>;

    // Create drag observable
    this.mousedrag$ = this.mousedown$.pipe(
      // Only from left button
      filter(mdEvent => mdEvent.button === 0),
      tap(() => document.body.classList.add('no-select')),
      mergeMap(mdEvent => {
        // get pointer start position
        const startX = mdEvent.clientX - +this.draggable.getAttribute('data-x');
        const startY = mdEvent.pageY - +this.draggable.getAttribute('data-y');
        // listen to mousemove
        return this.mousemove$.pipe(
          map(mmEvent => {
            let scrollY = 0;
            if (this.bounds) {
              scrollY = this.bounds.scrollTop;
            }
            return {
              left: mmEvent.clientX - startX,
              top: mmEvent.pageY - startY + scrollY,
            };
          }),
          // stop listening to mousemove on mouseup
          takeUntil(this.mouseup$.pipe(
            tap(() => {
              document.body.classList.remove('no-select');
              this.clearSelection();
            })
          ))
        );
      }),
    );

    // Listen to drag observable
    this.mousedrag$.pipe(
    ).subscribe(pos => {
      // Get left and top position from the mouse
      const finalPos: DraggablePosition = this.checkBounds(pos.left, pos.top);
      this.draggable.style.transform = 'translate(' + finalPos.leftPos + 'px, ' + finalPos.topPos + 'px)';
      // In each case, set data-x and data-y
      this.draggable.setAttribute('data-x', finalPos.leftPos.toString());
      this.draggable.setAttribute('data-y', finalPos.topPos.toString());
    });
  }

  getContainerRect(boundContainer: HTMLElement): PartialDomRect {
    if (boundContainer) {
      return {
        width: boundContainer.clientWidth,
        height: boundContainer.scrollHeight,
        left: this.draggableAbsolutePosition ? 0 : boundContainer.offsetLeft,
        top: this.draggableAbsolutePosition ? 0 : boundContainer.offsetTop
      };
    } else {
      return {
        width: document.body.scrollWidth,
        height: document.body.scrollHeight,
        left: 0,
        top: 0
      };
    }
  }

  getBounds(): Bounds {
    let boundLeft: number;
    let boundRight: number;
    let boundTop: number;
    let boundBottom: number;
    if (this.draggableAbsolutePosition && !this.bounds) {
      boundLeft = -this.draggableRect.left;
      boundRight = this.containerWidth - this.draggableRect.left - this.draggableWidth;
      boundTop = -this.draggableRect.top;
      boundBottom = this.containerHeight;
    } else {
      boundLeft = this.containerLeft - this.draggable.offsetLeft;
      boundRight = this.containerWidth - this.draggableWidth - this.draggable.offsetLeft + this.containerLeft;
      boundTop = this.containerTop - this.draggable.offsetTop;
      boundBottom = this.containerHeight - this.draggableHeight - this.draggable.offsetTop + this.containerTop;
    }
    return {
      left: boundLeft,
      right: boundRight,
      top: boundTop,
      bottom: boundBottom
    };
  }

  checkBounds(leftPos: number, topPos: number): DraggablePosition {
    let newLeftPos = leftPos;
    let newTopPos = topPos;
    let left = false;
    let right = false;
    let top = false;
    let bottom = false;
    const bounds = this.getBounds();

    // Snap to grid
    // if (this.columns) {
    //   newLeftPos = Math.round(newLeftPos / this.columnWidth) * this.columnWidth;
    // }

    if (newLeftPos < bounds.left) {
      newLeftPos = bounds.left;
      left = true;
    }
    if (newLeftPos > bounds.right) {
      newLeftPos = bounds.right;
      right = true;
    }
    if (topPos < bounds.top) {
      newTopPos = bounds.top;
      top = true;
    }
    if (topPos > bounds.bottom) {
      newTopPos = bounds.bottom;
      bottom = true;
    }
    return {
      leftPos: newLeftPos,
      topPos: newTopPos,
      left: left,
      right: right,
      top: top,
      bottom: bottom
    };
  }

  // replaceElementOnGrid() {
    // this.draggable.style.transform = 'translate(' + this.initialGridOffsetX + 'px, ' + 0 + 'px)';
    // this.draggable.setAttribute('data-x', this.initialGridOffsetX.toString());
    // this.draggable.setAttribute('data-y', offsetY.toString());
  // }

  // getInitialGridOffset(): number {
  //   const distanceToLeftBorder = this.draggable.offsetLeft - this.containerLeft;
  //   let offsetX = 0;
  //   if (distanceToLeftBorder % this.columnWidth !== 0) {
  //     const nearestColumn = Math.round(distanceToLeftBorder / this.columnWidth);
  //     offsetX = nearestColumn * this.columnWidth - distanceToLeftBorder;
  //   }
  //   return offsetX;
  // }

  clearSelection(): void {
    if (window.getSelection) {
      window.getSelection().removeAllRanges();
    }
  }

}

