import Konva from 'konva';

Konva.Stage.prototype.simulateMouseDown = function(pos) {
  var top = this.content.getBoundingClientRect().top;

  this._mousedown({ clientX: pos.x, clientY: pos.y + top, button: pos.button });
};

Konva.Stage.prototype.simulateMouseMove = function(pos) {
  var top = this.content.getBoundingClientRect().top;

  var evt = { clientX: pos.x, clientY: pos.y + top, button: pos.button };

  this._mousemove(evt);
  Konva.DD._drag(evt);
};

Konva.Stage.prototype.simulateMouseUp = function(pos) {
  'use strict';
  var top = this.content.getBoundingClientRect().top;

  var evt = { clientX: pos.x, clientY: pos.y + top, button: pos.button };

  Konva.DD._endDragBefore(evt);
  this._mouseup(evt);
  Konva.DD._endDragAfter(evt);
};
