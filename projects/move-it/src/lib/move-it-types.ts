export interface IPosition {
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  handle?: string;
  offsetX?: number;
  offsetY?: number;
}

export interface IDimensions {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface IBounds {
  boundLeft: number;
  boundRight: number;
  boundTop: number;
  boundBottom: number;
}

export interface IDraggable {
  item: HTMLElement;
  initX: number;
  initY: number;
  offsetX: number;
  offsetY: number;
}

export interface IResizable {
  item: HTMLElement;
  width: number;
  height: number;
}
