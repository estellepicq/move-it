export interface MousePosition {
  left: number;
  top: number;
}

export interface DraggablePosition {
  initLeft: number;
  initTop: number;
  offsetLeft: number;
  offsetTop: number;
}

export interface DraggableMovingPosition extends DraggablePosition {
  leftEdge: boolean;
  rightEdge: boolean;
  topEdge: boolean;
  bottomEdge: boolean;
}

export interface Bounds {
  boundLeft: number;
  boundRight: number;
  boundTop: number;
  boundBottom: number;
}

export interface Grid {
  columnWidth: number;
  rowHeight: number;
}

export interface DimensionsPx {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface DimensionsOnGrid {
  x: number;
  y: number;
  w: number;
  h: number;
}