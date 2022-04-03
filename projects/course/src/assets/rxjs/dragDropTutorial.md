# 1. Initialize draggable element <a id="init-page"></a>

We initialize this template in a DragDropComponent:

```html
  <div #draggable class="draggable"></div>
```
```css
  .draggable {
      width: 200px;
      height: 200px;
      background-color: #ccc
  }
```

# 2. Initialize events <a id="init-observables"></a>

We init observables from events that we will need later: 

```ts
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Observable, fromEvent } from 'rxjs';

@Component({
  selector: 'app-drag-drop',
  templateUrl: './drag-drop.component.html',
  styleUrls: ['./drag-drop.component.scss']
})
export class DragDropComponent implements OnInit {

  @ViewChild('draggable', { static: true }) draggable: ElementRef; // get html element

  private start$: Observable<MouseEvent>;
  private move$: Observable<MouseEvent>;
  private stop$: Observable<MouseEvent>;

  constructor() {}

  ngOnInit(): void {
    this.start$ = fromEvent(this.draggable.nativeElement, 'mousedown');
    this.move$ = fromEvent(document, 'mousemove') as Observable<MouseEvent>;
    this.stop$ = fromEvent(document, 'mouseup') as Observable<MouseEvent>;
  }
}
```

# 3. Create drag and drop logic <a id="create-logic"></a>

```Typescript
  import { fromEvent, Observable, switchMap, takeUntil } from 'rxjs';
  (...)
  
  private drag$: Observable<MouseEvent>;

  ngOnInit(): void {
    (...)

    this.drag$ = this.start$.pipe( // init with the mousedown on draggable element
      switchMap(() => this.move$.pipe( // redirect to mousemove
        takeUntil(this.stop$) // stop when mouseup
      ))
    );
  }

```

# 4. Subscribe and make moves visible <a id="subscribe"></a>

```Typescript
  ngOnInit(): void {
    (...)

    this.drag$.subscribe(event => {
      const { layerX: x, layerY: y } = event as any; // type any in order to use non-standard layerX and layerY properties
      this.draggable.nativeElement.style.transform = `translateX(${x}px) translateY(${y}px)`;
    });
  }

```