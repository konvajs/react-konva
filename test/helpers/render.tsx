// Shared render helper. Uses `createRoot` from react-dom/client directly so the
// prod-build matrix run can use the same path — testing-library's `render`
// always wraps in `act`, but `React.act` is dev-only. This helper conditionally
// wraps in act (when available) and otherwise uses `flushSync` for sync flushing.
//
// Auto-cleanup runs after every test and asserts no Konva.Stage leaked.

import * as React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { afterEach, beforeEach, expect } from 'vitest';
import Konva from 'konva';
import { KonvaRenderer } from '../../src/ReactKonva';

import './mocking';

if (typeof (globalThis as any).IS_REACT_ACT_ENVIRONMENT === 'undefined') {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
}

// Suppress two noisy *expected* warnings from React's custom-reconciler
// interaction with `act`. Anything else is captured per-test and surfaced
// in afterEach so silent regressions can't hide. Tests that intentionally
// trigger a console.error should install their own `vi.spyOn(console,
// 'error').mockImplementation(() => {})` (the spy replaces our wrapper).
const SUPPRESSED_ERROR_PATTERNS = [
  'was not wrapped in act',
  'suspended resource finished loading',
  // React 19: prints when a component suspends inside an act scope that
  // wasn't awaited. Some of our suspense tests intentionally rely on the
  // initial sync render committing the fallback, then poll via vi.waitFor
  // for the resolved content — which trips this warning. The pattern is
  // load-bearing for the suite, not a bug.
  'A component suspended inside an `act` scope',
];

const originalConsoleError = console.error;
let unexpectedErrors: unknown[][] = [];
console.error = (...args: unknown[]) => {
  const m = args[0];
  if (
    typeof m === 'string' &&
    SUPPRESSED_ERROR_PATTERNS.some((p) => m.includes(p))
  ) {
    return;
  }
  unexpectedErrors.push(args);
  originalConsoleError.apply(console, args);
};

const reactAct: ((cb: () => any) => any) | undefined = (React as any).act;

// In prod, react-dom's `flushSync` drains only react-dom's roots — the Konva
// secondary reconciler has its own scheduling. Stage's useLayoutEffect calls
// `KonvaRenderer.flushSyncWork()` for the same reason (see ReactKonvaCore
// .tsx:171-180); the prod-mode polyfills below mirror that pattern.
const flushBoth = (cb: () => void) => {
  flushSync(cb);
  KonvaRenderer.flushSyncWork();
};

// Run `cb` inside React.act if available, else inside flushSync. Used by
// render/rerender/unmount internally — these always pass a synchronous cb.
const sync = (cb: () => void) => {
  if (reactAct) reactAct(cb);
  else flushBoth(cb);
};

// Public `act` for test code.
//   Dev (React.act available): delegates directly. Sync and async cb both
//     drain awaited work and run effects per React's contract.
//   Prod (React.act undefined): polyfills to run cb inside flushSync, then
//     drain the Konva reconciler. If cb returned a promise, await it then
//     drain again so any reactive work scheduled in the continuation lands.
export function act(cb: () => any | Promise<any>): Promise<any> {
  if (reactAct) return Promise.resolve(reactAct(cb));
  let returned: any;
  flushBoth(() => {
    returned = cb();
  });
  const isThenable =
    !!returned && typeof (returned as Promise<unknown>).then === 'function';
  if (!isThenable) return Promise.resolve(returned);
  return (returned as Promise<unknown>).then((value) => {
    flushBoth(() => {});
    return value;
  });
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

beforeEach(() => {
  unexpectedErrors = [];
});

afterEach(async () => {
  cleanup();
  // Stage delays destroy() via setTimeout(0) under StrictMode so same-tick
  // remount can reuse the Konva.Stage. Wait one tick before asserting no leaks.
  await new Promise((r) => setTimeout(r, 0));
  const leaks: string[] = [];
  if (Konva.stages.length !== 0) {
    const leaked = Konva.stages.length;
    Konva.stages.forEach((s) => s.destroy());
    Konva.stages.length = 0;
    leaks.push(`leaked ${leaked} Konva.Stage instance(s) after test cleanup`);
  }
  if (unexpectedErrors.length > 0) {
    const messages = unexpectedErrors
      .map((args) => {
        const head = typeof args[0] === 'string' ? args[0] : String(args[0]);
        return `  - ${head.split('\n')[0].slice(0, 200)}`;
      })
      .join('\n');
    leaks.push(
      `${unexpectedErrors.length} unexpected console.error call(s) during test:\n${messages}`
    );
    unexpectedErrors = [];
  }
  if (leaks.length > 0) expect.fail(leaks.join('\n'));
});
