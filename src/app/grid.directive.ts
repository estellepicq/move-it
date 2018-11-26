import { Directive, ElementRef, OnInit, Input, AfterViewInit } from '@angular/core';

interface ChildElementOptions {
  id?: string;
  class?: string;
  href?: string;
  src?: string;
  alt?: string;
  width?: string;
  height?: string;
  textContent?: string;
  innerHTML?: string;
}

@Directive({
  selector: '[appGrid]'
})

export class GridDirective implements OnInit, AfterViewInit {

  @Input() columns: number;
  @Input() rows: number;
  container: HTMLElement;
  columnWidth: number;
  draggables: NodeListOf<HTMLElement>;
  gridCells: HTMLElement[] = [];

  constructor(
    private el: ElementRef,
  ) { }

  ngOnInit() {
    this.container = this.el.nativeElement;
    this.columnWidth = Math.round(this.container.clientWidth / this.columns);
  }

  ngAfterViewInit() {
    this.draggables = this.container.querySelectorAll('[appDraggable]');
    this.removeDraggablesFromContainer();
    this.generateGrid();
    this.appendDraggablesToGrid();
  }

  removeDraggablesFromContainer() {
    this.draggables.forEach(draggable => {
      this.container.removeChild(draggable);
    });
  }

  appendDraggablesToGrid() {
    this.draggables.forEach(draggable => {
      this.gridCells.forEach((cell, index) => {
        if (cell.getAttribute('taken') === 'false' && draggable) {
          cell.appendChild(draggable);
          const takenColumnsNb = Math.round(draggable.clientWidth / this.columnWidth);
          draggable = undefined;
          for (let i = index; i < takenColumnsNb - index; i++) {
            this.gridCells[i].setAttribute('taken', 'true');
          }
        }
      });
    });
  }

  generateGrid() {
    const gridDiv = this.addHTMLElement(this.container, 'div', { class: 'grid' });
    gridDiv.style.width = '100%';
    gridDiv.style.height = '100%';
    gridDiv.style.display = 'flex';
    gridDiv.style.flexWrap = 'wrap';

    for (let i = 0; i < this.columns; i++) {
      this.gridCells[i] = this.addHTMLElement(gridDiv, 'div');
      this.gridCells[i].style.width = this.columnWidth - 1 + 'px';
      this.gridCells[i].style.borderBottom = '1px solid black';
      this.gridCells[i].style.borderRight = '1px solid black';
      this.gridCells[i].setAttribute('taken', 'false');
    }
  }

  addHTMLElement(parentElement: HTMLElement, childElementType: string, childElementOptions?: ChildElementOptions): HTMLElement {
    const newElement = document.createElement(childElementType);
    if (childElementOptions !== undefined) {
      Object.keys(childElementOptions).forEach(key => {
        if (key === 'textContent' || key === 'innerHTML') {
          newElement[key] = childElementOptions[key];
        } else {
          newElement.setAttribute(key, childElementOptions[key]);
        }
      });
    }
    parentElement.appendChild(newElement);
    return newElement;
  }


}
