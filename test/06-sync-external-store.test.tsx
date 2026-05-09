// §6 — useSyncExternalStore integration.
// Tests against a plain manual store; mobx-react-lite tests live in §7.

import * as React from 'react';
import { describe, it, expect } from 'vitest';
import Konva from 'konva';
import { Stage, Layer, Rect } from '../src/ReactKonva';
import { render, act } from './helpers/render';

type Listener = () => void;

interface SimpleStore<T> {
  getSnapshot: () => T;
  subscribe: (cb: Listener) => () => void;
  set: (next: T) => void;
  listenerCount: () => number;
}

function makeStore<T>(initial: T): SimpleStore<T> {
  let snapshot = initial;
  const listeners = new Set<Listener>();
  return {
    getSnapshot: () => snapshot,
    subscribe(cb) {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    set(next) {
      snapshot = next;
      listeners.forEach((l) => l());
    },
    listenerCount: () => listeners.size,
  };
}

describe('§6 useSyncExternalStore', () => {
  it('§6.1 plain store — Konva commits on store change', () => {
    const store = makeStore({ fill: 'red' });
    const Sub = () => {
      const { fill } = React.useSyncExternalStore(
        store.subscribe,
        store.getSnapshot
      );
      return <Rect width={10} height={10} fill={fill} />;
    };
    const { stage } = render(
      <Stage width={50} height={50}>
        <Layer>
          <Sub />
        </Layer>
      </Stage>
    );
    expect((stage()!.findOne('Rect') as Konva.Rect).fill()).toBe('red');
    act(() => store.set({ fill: 'green' }));
    expect((stage()!.findOne('Rect') as Konva.Rect).fill()).toBe('green');
  });

  it('§6.2 same-snapshot identity — no re-render, no Konva thrash', () => {
    const snap = { fill: 'red' };
    const store = makeStore(snap);
    let renderCount = 0;
    let createCount = 0;
    const Sub = () => {
      renderCount++;
      const { fill } = React.useSyncExternalStore(
        store.subscribe,
        store.getSnapshot
      );
      return (
        <Rect
          width={10}
          height={10}
          fill={fill}
          ref={(r) => {
            if (r) createCount++;
          }}
        />
      );
    };
    render(
      <Stage width={50} height={50}>
        <Layer>
          <Sub />
        </Layer>
      </Stage>
    );
    const renderBefore = renderCount;
    const createBefore = createCount;
    // "Set" the same identity — listeners fire but the snapshot is `===`.
    act(() => store.set(snap));
    expect(renderCount).toBe(renderBefore);
    expect(createCount).toBe(createBefore);
  });

  it('§6.3 new snapshot every render via stable selector — no infinite loop', () => {
    // Simulates a store whose getSnapshot derives a new object each call but
    // a memoized selector stabilizes identity.
    const store = makeStore({ items: [1, 2, 3] });
    let renderCount = 0;
    const Sub = () => {
      renderCount++;
      const items = React.useSyncExternalStore(
        store.subscribe,
        () => store.getSnapshot().items
      );
      return <Rect width={10} height={10} name={`n-${items.length}`} />;
    };
    render(
      <Stage width={50} height={50}>
        <Layer>
          <Sub />
        </Layer>
      </Stage>
    );
    expect(renderCount).toBeLessThan(10);
  });

  it('§6.4 multiple subscribers — both update on change', () => {
    const store = makeStore({ x: 0 });
    const SubA = () => {
      const { x } = React.useSyncExternalStore(
        store.subscribe,
        store.getSnapshot
      );
      return <Rect name="a" width={10} height={10} x={x} />;
    };
    const SubB = () => {
      const { x } = React.useSyncExternalStore(
        store.subscribe,
        store.getSnapshot
      );
      return <Rect name="b" width={10} height={10} x={x + 1} />;
    };
    const { stage } = render(
      <Stage width={200} height={50}>
        <Layer>
          <SubA />
          <SubB />
        </Layer>
      </Stage>
    );
    act(() => store.set({ x: 42 }));
    expect((stage()!.findOne('.a') as Konva.Rect).x()).toBe(42);
    expect((stage()!.findOne('.b') as Konva.Rect).x()).toBe(43);
  });

  it('§6.5 subscriber unsubscribes on teardown — listener count returns to zero', () => {
    const store = makeStore({ x: 0 });
    expect(store.listenerCount()).toBe(0);
    const Sub = () => {
      React.useSyncExternalStore(store.subscribe, store.getSnapshot);
      return <Rect width={10} height={10} />;
    };
    const result = render(
      <Stage width={50} height={50}>
        <Layer>
          <Sub />
        </Layer>
      </Stage>
    );
    expect(store.listenerCount()).toBeGreaterThan(0);
    result.unmount();
    expect(store.listenerCount()).toBe(0);
  });
});
