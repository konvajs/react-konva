async function batchDrawInCurrentTick() {
  this._batchDrawExcuted = false;
  // Create a microtask to wait for other `batchDraw`s to be called.
  await 0;
  // draw() can only be called once inside one frame(16ms)
  if (this._batchDrawExcuted) return;
  this.draw();
  this._batchDrawExcuted = true;
}

export const overrideBatchDraw = (BaseLayer) => {
  BaseLayer.prototype.batchDrawInCurrentTick = batchDrawInCurrentTick;
  BaseLayer.prototype._original_batchDraw = BaseLayer.prototype.batchDraw;
  BaseLayer.prototype.batchDraw = function() {
    this.batchDrawInCurrentTick();
    return this;
  };
};
