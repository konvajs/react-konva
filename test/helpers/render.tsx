// Shared render helper. Uses `createRoot` from react-dom/client directly so the
// prod-build matrix run can use the same path — testing-library's `render`
// always wraps in `act`, but `React.act` is dev-only, so testing-library can't
// run against the production React build. This helper conditionally wraps in
// act (when available) and otherwise renders synchronously.
//
// Auto-cleanup runs after every test and asserts no Konva.Stage was leaked.

import * as React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { afterEach, expect } from 'vitest';
import Konva from 'konva';

import './mocking';

if (typeof (globalThis as any).IS_REACT_ACT_ENVIRONMENT === 'undefined') {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
}

const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  const message = args[0];
  if (
    typeof message === 'string' &&
    (message.includes('was not wrapped in act') ||
      message.includes('suspended resource finished loading'))
  ) {
    return;
  }
  originalConsoleError.apply(console, args);
};

const reactAct: ((cb: () => any) => any) | undefined = (React as any).act;

// Synchronously runs `cb` inside React's `act` if available. In production-mode
// runs (no `React.act`), wrap synchronous callbacks in `flushSync` so the
// resulting commit lands before the next assertion. Async callbacks are run
// without flushSync since they may await work that flushSync cannot drain.
export function act(cb: () => any | Promise<any>) {
  if (reactAct) return reactAct(cb);
  let result: any;
  let didReturnPromise = false;
  flushSync(() => {
    result = cb();
    if (result && typeof (result as Promise<unknown>).then === 'function') {
      didReturnPromise = true;
    }
  });
  return didReturnPromise ? result : Promise.resolve(result);
}

interface MountedRoot {
  root: Root;
  container: HTMLElement;
}

const mountedRoots: MountedRoot[] = [];

export interface KonvaRenderResult {
  stage: () => Konva.Stage | undefined;
  rerender: (ui: React.ReactElement) => void;
  unmount: () => void;
  container: HTMLElement;
}

export function render(ui: React.ReactElement): KonvaRenderResult {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  if (reactAct) {
    reactAct(() => {
      root.render(ui);
    });
  } else {
    flushSync(() => {
      root.render(ui);
    });
  }

  mountedRoots.push({ root, container });

  return {
    container,
    stage: () => Konva.stages[Konva.stages.length - 1],
    rerender: (next: React.ReactElement) => {
      if (reactAct) {
        reactAct(() => {
          root.render(next);
        });
      } else {
        flushSync(() => {
          root.render(next);
        });
      }
    },
    unmount: () => {
      if (reactAct) {
        reactAct(() => {
          root.unmount();
        });
      } else {
        flushSync(() => {
          root.unmount();
        });
      }
      const idx = mountedRoots.findIndex((m) => m.root === root);
      if (idx >= 0) mountedRoots.splice(idx, 1);
      container.parentNode?.removeChild(container);
    },
  };
}

export function cleanup() {
  while (mountedRoots.length > 0) {
    const { root, container } = mountedRoots.pop()!;
    try {
      if (reactAct) {
        reactAct(() => root.unmount());
      } else {
        flushSync(() => root.unmount());
      }
    } catch {}
    container.parentNode?.removeChild(container);
  }
}

afterEach(async () => {
  cleanup();
  // The Stage component delays its destroy() via setTimeout(0) under StrictMode
  // so a same-tick remount can reuse the existing Konva.Stage. Await one tick
  // here so those deferred destroys actually run before we assert no leaks.
  await new Promise((r) => setTimeout(r, 0));
  if (Konva.stages.length !== 0) {
    const leaked = Konva.stages.length;
    Konva.stages.forEach((s) => s.destroy());
    Konva.stages.length = 0;
    expect.fail(`leaked ${leaked} Konva.Stage instance(s) after test cleanup`);
  }
});
