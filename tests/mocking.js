import Konva from 'konva';

Konva.Stage.prototype.simulateMouseDown = function (pos) {
  var top = this.content.getBoundingClientRect().top;

  this._pointerdown({
    clientX: pos.x,
    clientY: pos.y + top,
    button: pos.button,
    type: 'mousedown',
  });
};

Konva.Stage.prototype.simulateMouseMove = function (pos) {
  var top = this.content.getBoundingClientRect().top;

  var evt = {
    clientX: pos.x,
    clientY: pos.y + top,
    button: pos.button,
    type: 'mousemove',
  };

  this._pointermove(evt);
  Konva.DD._drag(evt);
};

Konva.Stage.prototype.simulateMouseUp = function (pos) {
  'use strict';
  var top = this.content.getBoundingClientRect().top;

  var evt = {
    clientX: pos.x,
    clientY: pos.y + top,
    button: pos.button,
    type: 'mouseup',
  };

  Konva.DD._endDragBefore(evt);
  this._pointerup(evt);
  Konva.DD._endDragAfter(evt);
};
