# Move.it

Drag & Drop enabled with an Angular directive.

## Table of contents 
1. [Getting Started](#getting-started)
2. [Latest Update](#latest-update)
3. [Installation](#installation)
4. [Draggable](#draggable)
5. [Events](#events)
6. [Demo](#demo)

# Getting Started
Add `appDraggable` directive to DOM elements to enable Drag & Drop.

# Latest Update
+ 2018.12.09: 0.1.0
  + Init version with demo

# Installation
`git clone https://github.com/estellepicq/Move.it.git` and get `draggable.directive.ts`

# Draggable

Use `appDraggable` directive to make the DOM element draggable.
  + Simple example:

    ```html
    <div appDraggable>Move me everywhere</div>
    ```

  + Use `[bounds]` to limit the draggable element into a container:

  ```html
  <div class="container" #bounds>
    <div appDraggable [bounds]="bounds">
      <div>Can't get out of my box</div>
    </div>
  </div>
  ```

  + Use `[draggableFrom]` to move element from a specific handle:

    ```html
    <div appDraggable [draggableFrom]="handle">
      <div class="handle">Handle</div>
      <div>Can be drag only from my handle</div>
    </div>
    ```

# Events

+ `appDraggable` directive:

    | Output | $event | Description |
    | ------ | ------ | ----------- |
    | mDragStart | { item: HTMLElement, initLeft: number, initTop: number, offsetLeft: number, offsetTop: number } | Emitted when start dragging |
    | mDragMove | { item: HTMLElement, initLeft: number, initTop: number, offsetLeft: number, offsetTop: number, leftEdge: boolean, rightEdge: boolean, topEdge: boolean, bottomEdge: boolean } | Emitted when dragging |
    | mDragStop | { item: HTMLElement, initLeft: number, initTop: number, offsetLeft: number, offsetTop: number } | Emitted when stop dragging |

    Simple example:
    ```html
    <div appDraggable
      (mDragStart)="onStart($event)"
      (mDragMove)="onMove($event)"
      (mDragStop)="onStop($event)">
      Move me
    </div>
    ```


# Demo
You can clone this repo and launch the demo page on your local machine:
```bash
npm install
ng serve

The demo page server is listening to: http://localhost:4200