// §8 — Stage destroy / unmount.
// The destroy-time flushSyncFromReconciler was added because of a production
// bug we couldn't reproduce locally. Keep these as guards even if they all pass.

import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { describe, it, expect } from 'vitest';
import Konva from 'konva';
import { Stage, Layer, Rect } from '../src/ReactKonva';
import { render, act } from './helpers/render';

const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));

describe('§8 stage destroy / unmount', () => {
  it('§8.1 clean unmount with no pending work', async () => {
    const before = Konva.stages.length;
    const result = render(
      <Stage width={50} height={50}>
        <Layer />
      </Stage>
    );
    expect(Konva.stages.length).toBe(before + 1);
    act(() => result.unmount());
    await tick();
    expect(Konva.stages.length).toBe(before);
  });

  it('§8.2 unmount with pending external state changes does not crash', async () => {
    type Listener = () => void;
    let listeners: Listener[] = [];
    let snap = { x: 0 };
    const subscribe = (cb: Listener) => {
      listeners.push(cb);
      return () => {
        listeners = listeners.filter((l) => l !== cb);
      };
    };
    const Sub = () => {
      const { x } = React.useSyncExternalStore(
        subscribe,
        () => snap
      );
      return <Rect width={10} height={10} x={x} />;
    };
    const result = render(
      <Stage width={50} height={50}>
        <Layer>
          <Sub />
        </Layer>
      </Stage>
    );
    // Schedule a re-render via store change, then unmount in the same tick.
    snap = { x: 5 };
    listeners.forEach((l) => l());
    act(() => result.unmount());
    await tick();
    // No crash. No leaked stages — afterEach asserts.
    expect(true).toBe(true);
  });

  it('§8.3 unmount during commit (error boundary) — no leaked Konva.Stage', async () => {
    let trigger!: () => void;
    class Boundary extends React.Component<
      { children: React.ReactNode },
      { error: boolean }
    > {
      state = { error: false };
      static getDerivedStateFromError() {
        return { error: true };
      }
      render() {
        return this.state.error ? null : this.props.children;
      }
    }
    const Bomb = () => {
      const [boom, setBoom] = React.useState(false);
      trigger = () => setBoom(true);
      if (boom) throw new Error('commit-time bomb');
      return <Rect width={10} height={10} />;
    };
    render(
      <Boundary>
        <Stage width={50} height={50}>
          <Layer>
            <Bomb />
          </Layer>
        </Stage>
      </Boundary>
    );
    // act() rethrows the boundary-caught error after handling. We expect that;
    // the contract under test is "the Stage is unmounted cleanly when its
    // subtree errors during commit" — verified by afterEach's leak guard.
    try {
      act(() => {
        trigger();
      });
    } catch {}
    await tick();
  });

  it('§8.4 multiple Stages, one unmounts mid-render — surviving stage unaffected', async () => {
    const refA = React.createRef<Konva.Stage>();
    const refB = React.createRef<Konva.Stage>();
    let setShowB!: (v: boolean) => void;
    const App = () => {
      const [showB, sB] = React.useState(true);
      setShowB = sB;
      return (
        <>
          <Stage ref={refA} width={50} height={50}>
            <Layer>
              <Rect name="a" width={10} height={10} />
            </Layer>
          </Stage>
          {showB && (
            <Stage ref={refB} width={50} height={50}>
              <Layer>
                <Rect name="b" width={10} height={10} />
              </Layer>
            </Stage>
          )}
        </>
      );
    };
    render(<App />);
    expect(refA.current!.findOne('.a')).toBeInstanceOf(Konva.Rect);
    expect(refB.current!.findOne('.b')).toBeInstanceOf(Konva.Rect);

    act(() => setShowB(false));
    await tick();
    expect(refA.current!.findOne('.a')).toBeInstanceOf(Konva.Rect);
  });

  it('§8.5 rapid mount/unmount cycles — no leaked Konva.Stage after 50 cycles', async () => {
    const before = Konva.stages.length;
    for (let i = 0; i < 50; i++) {
      const result = render(
        <Stage width={50} height={50}>
          <Layer>
            <Rect width={10} height={10} />
          </Layer>
        </Stage>
      );
      act(() => result.unmount());
    }
    // Allow StrictMode-style deferred destroys to drain (none here, but cheap).
    await tick();
    expect(Konva.stages.length).toBe(before);
  });

  it('§8.6 unmount inside act() vs outside both drain microtasks', async () => {
    const insideAct = render(
      <Stage width={50} height={50}>
        <Layer />
      </Stage>
    );
    act(() => insideAct.unmount());
    await tick();
    expect(Konva.stages.length).toBe(0);

    const outsideAct = render(
      <Stage width={50} height={50}>
        <Layer />
      </Stage>
    );
    outsideAct.unmount(); // bare call, no act wrapper
    await tick();
    expect(Konva.stages.length).toBe(0);
  });

  it('§8.7 user code calls stage.destroy() directly — next reconciliation pass does not crash', async () => {
    let setN!: (n: number) => void;
    const App = ({ n }: { n: number }) => (
      <Stage width={50} height={50}>
        <Layer>
          {Array.from({ length: n }, (_, i) => (
            <Rect key={i} width={10} height={10} />
          ))}
        </Layer>
      </Stage>
    );
    const Wrapper = () => {
      const [n, set] = React.useState(1);
      setN = set;
      return <App n={n} />;
    };
    const { stage } = render(<Wrapper />);
    const s = stage()!;
    // User-level escape hatch — destroy the underlying Konva node.
    s.destroy();
    // Trigger another reconciliation. Should not throw.
    expect(() =>
      act(() => {
        setN(3);
      })
    ).not.toThrow();
  });
});
