# move-it

Drag & Drop & Resize enabled with Angular directives.
Chrome and Firefox compatible.

[Demo](http://moveit.estellepicq.com/)

## Table of contents 
1. [Installation](#installation)
2. [Draggable](#draggable)
3. [Resizable](#resizable)
4. [Events](#events)
5. [Local Development](#local-development)

# Installation

1. `npm install @epicq/move-it`

2. Import `MoveItModule` in your app module (or any other angular module):
  ```typescript
  import { MoveItModule } from '@epicq/move-it';

  @NgModule({
    imports: [
      ...,
      MoveItModule
    ],
    ...
  })
  export class AppModule { }
  ```

  3. Import `move-it.css` in your project. If you use `angular-cli`, you can add this in `angular.json`:

  ```diff
  "styles": [
      ...
  +   "node_modules/@epicq/move-it/lib/move-it.css"
  ]
  ```

# Draggable

  Use `ngMoveit` directive to make the DOM element draggable.
  + Simple example:

    ```html
    <div ngMoveit>Move me everywhere</div>
    ```

  + Use `[bounds]` to limit the draggable element into a container:

  ```html
  <div class="container" #bounds>
    <div ngMoveit [bounds]="bounds">
      <div>Can't get out of my box</div>
    </div>
  </div>
  ```

  + Use `[draggableFrom]` to move element from a specific handle:

    ```html
    <div ngMoveit [draggableFrom]="handle">
      <div class="handle">Handle</div>
      <div>Can be drag only from my handle</div>
    </div>
    ```

# Resizable

Use `ngSizeit` directive to make the DOM element resizable.
  + Simple example:

    ```html
    <div ngSizeit>Resize me</div>
    ```

  + Use `[bounds]` to limit the element into a container:

  ```html
  <div class="container" #bounds>
    <div ngSizeit [bounds]="bounds">
      <div>Can't be bigger than my box</div>
    </div>
  </div>
  ```

# Events

+ `ngMoveit` directive:

    | Output | $event | Description |
    | ------ | ------ | ----------- |
    | mDragStart | { item: HTMLElement, initLeft: number, initTop: number, offsetLeft: number, offsetTop: number } | Emitted when start dragging |
    | mDragMove | { item: HTMLElement, initLeft: number, initTop: number, offsetLeft: number, offsetTop: number } | Emitted when dragging |
    | mDragStop | { item: HTMLElement, initLeft: number, initTop: number, offsetLeft: number, offsetTop: number } | Emitted when stop dragging |

    Simple example:
    ```html
    <div ngMoveit
      (mDragStart)="onStart($event)"
      (mDragMove)="onMove($event)"
      (mDragStop)="onStop($event)">
      Move me
    </div>
    ```

+ `ngSizeit` directive:

    | Output | $event | Description |
    | ------ | ------ | ----------- |
    | mResizeStart | { item: HTMLElement, width: number, height: number } | Emitted when start resizing |
    | mResizeMove | { item: HTMLElement, width: number, height: number } | Emitted when resizing |
    | mResizeStop | { item: HTMLElement, width: number, height: number } | Emitted when stop resizing |

    Simple example:
    ```html
    <div ngSizeit
      (mResizeStart)="onStart($event)"
      (mResizeMove)="onMove($event)"
      (mResizeStop)="onStop($event)">
      Resize me
    </div>
    ```

# Local development
You can clone this repo and launch the demo page on your local machine:
```bash
npm install
npm run build:lib
npm run start
```

The demo page server is listening to: http://localhost:4201

