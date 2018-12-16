# move-it

Drag & Drop & Resize enabled with Angular directives.
to be completed: live demo link

## Table of contents 
1. [Getting Started](#getting-started)
2. [Latest Update](#latest-update)
3. [Installation](#installation)
4. [Draggable](#draggable)
5. [Resizable](#resizable)
6. [Events](#events)
7. [Demo](#demo)

# Getting Started
Add `ngMoveit` directive to DOM elements to enable Drag & Drop.

# Latest Update
+ 2018.12.09: 0.0.1
  + Init version with demo

# Installation

to be completed: instructions

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

# Demo
You can clone this repo and launch the demo page on your local machine:
```bash
npm install
npm run start
```

The demo page server is listening to: http://localhost:4201

