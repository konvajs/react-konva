// Real-event simulators for tests. We dispatch MouseEvents on the Konva
// stage container so Konva's PUBLIC listeners run end-to-end — no reaching
// for `_pointerdown` / `(Konva as any).DD._drag` private internals (those
// rename without notice). We use `mousedown`/`mousemove`/`mouseup` rather
// than the `pointer*` variants because Konva's `pointerEventsEnabled` is
// off by default — pointer events would early-return in getEventsMap.
// DiscreteEventPriority for state updates from these handlers comes from
// react-konva's host config, not from the source event, so synthetic
// dispatch is fine for the priority-sensitive tests.
import Konva from 'konva';

declare module 'konva/lib/Stage' {
  interface Stage {
    simulateMouseDown(pos: { x: number; y: number; button?: number }): void;
    simulateMouseMove(pos: { x: number; y: number; button?: number }): void;
    simulateMouseUp(pos: { x: number; y: number; button?: number }): void;
  }
}

function dispatch(
  stage: Konva.Stage,
  type: 'mousedown' | 'mousemove' | 'mouseup',
  pos: { x: number; y: number; button?: number }
) {
  const rect = stage.content.getBoundingClientRect();
  const init: MouseEventInit = {
    clientX: pos.x + rect.left,
    clientY: pos.y + rect.top,
    button: pos.button ?? 0,
    bubbles: true,
    cancelable: true,
  };
  stage.content.dispatchEvent(new MouseEvent(type, init));
}

(Konva.Stage.prototype as any).simulateMouseDown = function (pos: any) {
  dispatch(this, 'mousedown', pos);
};

(Konva.Stage.prototype as any).simulateMouseMove = function (pos: any) {
  dispatch(this, 'mousemove', pos);
};

(Konva.Stage.prototype as any).simulateMouseUp = function (pos: any) {
  dispatch(this, 'mouseup', pos);
};
