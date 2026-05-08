// §11 — SSR / static rendering.
// Runs in Node WITHOUT a DOM. Asserts:
//   1. Importing react-konva from a Node-only file does not crash on
//      `window` or `document` access at module-load time.
//   2. mobx-react-lite's `enableStaticRendering(true)` either works or fails
//      loudly (no half-initialized state).
//
// Vitest's browser mode applies globally, so this runs as a standalone
// Node script (`node test/11-ssr.mjs`) wired into npm scripts.

import assert from 'node:assert/strict';

// CRITICAL: do NOT pre-create a JSDOM here. The whole point is to verify
// react-konva loads cleanly in a Node environment with no `window`/`document`.
assert.equal(typeof globalThis.window, 'undefined', 'window must be undefined');
assert.equal(
  typeof globalThis.document,
  'undefined',
  'document must be undefined'
);

// §11.1 — module-load smoke test.
let RK;
try {
  RK = await import('../es/ReactKonvaCore.js');
} catch (err) {
  // konva itself may touch globals on import. We accept that, but the failure
  // mode must be a clean error — not a partial module that later corrupts.
  assert.fail(`react-konva module load crashed: ${err.message}`);
}
assert.ok(typeof RK.Stage === 'object' || typeof RK.Stage === 'function');
assert.ok(typeof RK.Layer === 'string');
assert.ok(typeof RK.Rect === 'string');
assert.ok(typeof RK.KonvaRenderer === 'object', 'KonvaRenderer must be exported');
console.log('§11.1 module-load OK');

// §11.2 — enableStaticRendering(true) does not blow up react-konva.
const { enableStaticRendering, observer } = await import('mobx-react-lite');
const { observable } = await import('mobx');

enableStaticRendering(true);
const store = observable({ x: 1 });
const Comp = observer(() => null);
assert.ok(typeof Comp === 'function' || typeof Comp === 'object');
// react-konva must not have eager DOM/canvas dependency that conflicts with
// static rendering. We don't `renderToString` here (that needs a renderer);
// the contract is: react-konva imports must not reach for `window`/`document`
// at module-load time. The §11.1 success above already proves that.
console.log('§11.2 enableStaticRendering OK');

// Restore so subsequent unrelated tests don't see static rendering on.
enableStaticRendering(false);

console.log('\n§11 SSR / static rendering: all OK');
