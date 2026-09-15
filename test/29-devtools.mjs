// Exercise the DevTools renderer protocol against built packages in fresh processes.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import React from 'react';
import Konva from 'konva/lib/Core.js';

const entry = process.argv[2];
if (!entry) {
  for (const mode of ['development', 'production']) {
    for (const format of ['es', 'lib']) {
      execFileSync(process.execPath, [fileURLToPath(import.meta.url), format], {
        env: { ...process.env, NODE_ENV: mode },
        stdio: 'inherit',
      });
    }
  }
} else {
  let renderer;
  const commits = [];
  // DevTools is an external integration. Its hook receives the real renderer
  // metadata and commit notifications, including the public editing interface.
  globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
    supportsFiber: true,
    inject(internals) {
      if (internals.rendererPackageName === 'react-konva') {
        renderer = internals;
        return 1;
      }
      return 2;
    },
    onCommitFiberRoot(id, root) {
      if (id === 1) commits.push(root);
    },
    onCommitFiberUnmount() {},
    onPostCommitFiberRoot() {},
  };
  const { KonvaRenderer, Rect } = await import(`../${entry}/ReactKonva.js`);
  assert.ok(renderer, 'react-konva registers with DevTools');
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(renderer.version, pkg.version);
  assert.match(renderer.reconcilerVersion, /^19\.3\./);

  const container = new Konva.Group();
  const onError = (error) => { throw error; };
  const root = KonvaRenderer.createContainer(
    container, 1, null, false, null, 'devtools-', onError, onError, onError, null,
  );
  let setCount;
  function Counter() {
    const [count, set] = React.useState(1);
    setCount = set;
    React.useDebugValue('canvas counter');
    return React.createElement(Rect, { x: count });
  }
  try {
    KonvaRenderer.flushSyncFromReconciler(() => {
      KonvaRenderer.updateContainer(React.createElement(Counter), root, null);
    });
    assert.equal(container.findOne('Rect').x(), 1);
    assert.ok(commits.includes(root), 'DevTools receives canvas commits');
    if (process.env.NODE_ENV === 'development') {
      const findCounter = (fiber) => fiber && (
        fiber.type === Counter ? fiber : findCounter(fiber.child) || findCounter(fiber.sibling)
      );
      const fiber = findCounter(root.current);
      assert.ok(fiber, 'DevTools can locate the canvas component');
      renderer.overrideHookState(fiber, 0, [], 2);
      KonvaRenderer.flushSyncWork();
      assert.equal(container.findOne('Rect').x(), 2, 'DevTools can edit canvas hook state');
    }
    KonvaRenderer.flushSyncFromReconciler(() => setCount(3));
    assert.equal(container.findOne('Rect').x(), 3);
    assert.ok(commits.length >= 2, 'DevTools receives canvas updates');
  } finally {
    KonvaRenderer.flushSyncFromReconciler(() => {
      KonvaRenderer.updateContainer(null, root, null);
    });
    container.destroy();
    delete globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__;
  }
  console.log(`${entry} ${process.env.NODE_ENV}: DevTools registration and canvas commits OK`);
}
