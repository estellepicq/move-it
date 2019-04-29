export interface IPosition {
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  initX?: number;
  initY?: number;
  item?: HTMLElement;
  resizeHandle?: string;
  shadow?: HTMLElement;
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

