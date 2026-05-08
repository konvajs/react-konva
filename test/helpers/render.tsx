// Shared render helper. Uses `createRoot` from react-dom/client directly so the
// prod-build matrix run can use the same path — testing-library's `render`
// always wraps in `act`, but `React.act` is dev-only. This helper conditionally
// wraps in act (when available) and otherwise uses `flushSync` for sync flushing.
//
// Auto-cleanup runs after every test and asserts no Konva.Stage leaked.

import * as React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { afterEach, expect } from 'vitest';
import Konva from 'konva';

import './mocking';

if (typeof (globalThis as any).IS_REACT_ACT_ENVIRONMENT === 'undefined') {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
}

// Suppress noisy expected warnings from React's custom-reconciler interaction
// with `act`. Other warnings still propagate.
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  const m = args[0];
  if (
    typeof m === 'string' &&
    (m.includes('was not wrapped in act') ||
      m.includes('suspended resource finished loading'))
  ) {
    return;
  }
  originalConsoleError.apply(console, args);
};

const reactAct: ((cb: () => any) => any) | undefined = (React as any).act;

// Run `cb` inside React.act if available, else inside flushSync.
const sync = (cb: () => void) => {
  if (reactAct) reactAct(cb);
  else flushSync(cb);
};

// Public `act` for test code. Mirrors React.act in dev, falls back to flushSync
// for sync work in prod (where React.act is unavailable). Async callbacks pass
// through unchanged in prod since flushSync can't drain awaited work.
export function act(cb: () => any | Promise<any>) {
  if (reactAct) return reactAct(cb);
  let result: any;
  let isPromise = false;
  flushSync(() => {
    result = cb();
    isPromise =
      !!result && typeof (result as Promise<unknown>).then === 'function';
  });
  return isPromise ? result : Promise.resolve(result);
}

const mountedRoots: { root: Root; container: HTMLElement }[] = [];

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
  sync(() => root.render(ui));
  mountedRoots.push({ root, container });

  return {
    container,
    stage: () => Konva.stages[Konva.stages.length - 1],
    rerender: (next) => sync(() => root.render(next)),
    unmount: () => {
      sync(() => root.unmount());
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
      sync(() => root.unmount());
    } catch {}
    container.parentNode?.removeChild(container);
  }
}

afterEach(async () => {
  cleanup();
  // Stage delays destroy() via setTimeout(0) under StrictMode so same-tick
  // remount can reuse the Konva.Stage. Wait one tick before asserting no leaks.
  await new Promise((r) => setTimeout(r, 0));
  if (Konva.stages.length !== 0) {
    const leaked = Konva.stages.length;
    Konva.stages.forEach((s) => s.destroy());
    Konva.stages.length = 0;
    expect.fail(`leaked ${leaked} Konva.Stage instance(s) after test cleanup`);
  }
});
