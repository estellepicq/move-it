import { Injectable } from '@angular/core';
import { IDimensions, IBounds, IPosition, IDraggable } from './move-it-types';

@Injectable()
export class MoveItService {

  // Draggable and container positions
  containerDimensions: IDimensions;
  containerBounds: IBounds;
  draggableDimensions: IDimensions;
  draggableLeftRatio: number;
  draggableTopRatio: number;

  // Draggable element
  draggable: HTMLElement;
  handle: HTMLElement;

  constructor() { }

  initDraggableDimensions() {
    this.draggableDimensions = {
      left: this.draggable.offsetLeft,
      top: this.draggable.offsetTop,
      width: this.draggable.clientWidth,
      height: this.draggable.clientHeight
    };
  }

  getContainerDimensions(bounds: HTMLElement): void {
    const borderLeftWidth = window.getComputedStyle(bounds).borderLeftWidth !== '' ?
      parseInt(window.getComputedStyle(bounds).borderLeftWidth, 10) :
      0;
    const borderTopWidth = window.getComputedStyle(bounds).borderTopWidth !== '' ?
      parseInt(window.getComputedStyle(bounds).borderTopWidth, 10) :
      0;
    const containerRect = bounds.getBoundingClientRect();
    this.containerDimensions = {
      left: borderLeftWidth + containerRect.left,
      top: borderTopWidth + containerRect.top,
      width: bounds.clientWidth,
      height: bounds.scrollHeight
    };
  }

  getBounds(): void {
    this.containerBounds = {
      boundLeft: -this.draggableDimensions.left,
      boundRight: this.containerDimensions.width - this.draggableDimensions.width - this.draggableDimensions.left,
      boundTop: -this.draggableDimensions.top,
      boundBottom: this.containerDimensions.height - this.draggableDimensions.height - this.draggableDimensions.top,
    };
  }

  move(leftPos: number, topPos: number, columnWidth: number): IDraggable {
    // Check bounds
    const checkedPos = this.checkBounds(leftPos, topPos, columnWidth);

    const movingPos: IDraggable = {
      item: this.draggable,
      initX: this.draggableDimensions.left,
      initY: this.draggableDimensions.top,
      offsetX: checkedPos.x,
      offsetY: checkedPos.y
    };

    // Move draggable element
    const translateX = 'translateX(' + leftPos + 'px) ';
    const translateY = 'translateY(' + topPos + 'px)';
    this.draggable.style.transform = translateX + translateY;

    // tslint:disable-next-line:max-line-length
    const shadowFilter = 'drop-shadow(rgba(0, 0, 0, 0.2) ' + (movingPos.offsetX - leftPos) + 'px ' +
      (movingPos.offsetY - topPos) + 'px 0px)';
    this.draggable.style.filter = shadowFilter;

    return movingPos;
  }

  checkBounds(leftPos: number, topPos: number, columnWidth: number): IPosition {
    let newLeftPos = Math.round(leftPos / columnWidth) * columnWidth;
    let newTopPos = Math.round(topPos / columnWidth) * columnWidth;

    if (newLeftPos < this.containerBounds.boundLeft) {
      newLeftPos = this.containerBounds.boundLeft;
    }
    if (newLeftPos > this.containerBounds.boundRight) {
      newLeftPos = this.containerBounds.boundRight;
    }
    if (newTopPos < this.containerBounds.boundTop) {
      newTopPos = this.containerBounds.boundTop;
    }
    if (newTopPos > this.containerBounds.boundBottom) {
      newTopPos = this.containerBounds.boundBottom;
    }

    return {
      x: newLeftPos,
      y: newTopPos,
    };
  }

  checkResizeBounds(x: number, y: number,
    columnWidth: number, minWidth: number, minHeight: number, testBounds): IPosition {
    const offsetX = this.getOffsetX();
    const offsetY = this.getOffsetY();
    let newX = Math.round((x - offsetX) / columnWidth) * columnWidth;
    let newY = Math.round((y - offsetY) / columnWidth) * columnWidth;

    if (newX < minWidth * columnWidth) {
      newX = minWidth * columnWidth;
    }

    if (newX > this.containerDimensions.width - offsetX) {
      newX = this.containerDimensions.width - offsetX;
    }

    if (newY < minHeight * columnWidth) {
      newY = minHeight * columnWidth;
    }

    if (newY > this.containerDimensions.height - offsetY) {
      newY = this.containerDimensions.height - offsetY;
    }

    console.log({newX, offsetX});
    if (-testBounds.x === this.draggableDimensions.left) {
      console.log('must stop now');
      // set newX to offsetX + width
    }

    return {
      x: newX,
      y: newY
    };
  }

  clearSelection(): void {
    if (window.getSelection) {
      window.getSelection().removeAllRanges();
    }
  }

  getOffsetX() {
    return this.draggable.style.transform !== '' ? Number(this.draggable.style.transform.match(/[-]{0,1}[\d]*[\.]{0,1}[\d]+/g)[0]) : 0;
  }

  getOffsetY() {
    return this.draggable.style.transform !== '' ? Number(this.draggable.style.transform.match(/[-]{0,1}[\d]*[\.]{0,1}[\d]+/g)[1]) : 0;
  }

}
