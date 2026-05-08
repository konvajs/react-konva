import Konva from 'konva';

declare module 'konva/lib/Stage' {
  interface Stage {
    simulateMouseDown(pos: { x: number; y: number; button?: number }): void;
    simulateMouseMove(pos: { x: number; y: number; button?: number }): void;
    simulateMouseUp(pos: { x: number; y: number; button?: number }): void;
  }
}

(Konva.Stage.prototype as any).simulateMouseDown = function (pos: any) {
  const top = this.content.getBoundingClientRect().top;
  this._pointerdown({
    clientX: pos.x,
    clientY: pos.y + top,
    button: pos.button,
    type: 'mousedown',
  });
};

(Konva.Stage.prototype as any).simulateMouseMove = function (pos: any) {
  const top = this.content.getBoundingClientRect().top;
  const evt = {
    clientX: pos.x,
    clientY: pos.y + top,
    button: pos.button,
    type: 'mousemove',
  };
  this._pointermove(evt);
  (Konva as any).DD._drag(evt);
};

(Konva.Stage.prototype as any).simulateMouseUp = function (pos: any) {
  const top = this.content.getBoundingClientRect().top;
  const evt = {
    clientX: pos.x,
    clientY: pos.y + top,
    button: pos.button,
    type: 'mouseup',
  };
  (Konva as any).DD._endDragBefore(evt);
  this._pointerup(evt);
  (Konva as any).DD._endDragAfter(evt);
};
