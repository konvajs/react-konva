// §8 — Stage destroy / unmount.
// The destroy-time flushSyncFromReconciler was added because of a production
// bug we couldn't reproduce locally. Keep these as guards even if they all pass.

import * as React from 'react';
import { describe, it, expect, vi } from 'vitest';
import Konva from 'konva';
import { Stage, Layer, Rect } from '../src/ReactKonva';
import { render, act } from './helpers/render';

describe('§8 stage destroy / unmount', () => {
  it('§8.1 clean unmount with no pending work', async () => {
    const before = Konva.stages.length;
    const result = render(
      <Stage width={50} height={50}>
        <Layer />
      </Stage>
    );
    expect(Konva.stages.length).toBe(before + 1);
    result.unmount();
    await vi.waitFor(() => expect(Konva.stages.length).toBe(before));
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
    expect(() => result.unmount()).not.toThrow();
    // After unmount, the subscriber must have torn down its listener.
    await vi.waitFor(() => expect(listeners.length).toBe(0));
  });

  it('§8.3 react-dom boundary catches a sibling render-error and unmounts the Stage cleanly', async () => {
    // Architectural note (see §13 file header): error boundaries ABOVE <Stage>
    // do NOT catch errors thrown inside Stage's subtree, because Stage owns its
    // own secondary reconciler container. So this test puts the bomb in a
    // SIBLING of <Stage> (still inside the react-dom tree) — when the boundary
    // catches it and re-renders without children, React unmounts the Stage.
    // React reports the caught error via console.error; silence that so the
    // suite-wide strict guard doesn't flag this expected noise.
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
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
        if (boom) throw new Error('render-time bomb in dom-tree sibling');
        return null;
      };
      const before = Konva.stages.length;
      render(
        <Boundary>
          <>
            <Bomb />
            <Stage width={50} height={50}>
              <Layer>
                <Rect width={10} height={10} />
              </Layer>
            </Stage>
          </>
        </Boundary>
      );
      expect(Konva.stages.length).toBe(before + 1);
      act(() => trigger());
      // After boundary swaps to null, the Stage in the dom-tree must be unmounted
      // and its underlying Konva.Stage destroyed (deferred via setTimeout(0)).
      await vi.waitFor(() => expect(Konva.stages.length).toBe(before));
    } finally {
      errSpy.mockRestore();
    }
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
    // refB's stage is being destroyed (deferred via setTimeout), but refA must
    // remain intact through the destroy.
    await vi.waitFor(() =>
      expect(refA.current!.findOne('.a')).toBeInstanceOf(Konva.Rect)
    );
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
      result.unmount();
    }
    // Drain any deferred destroys (Konva.Stage.destroy can be setTimeout-scheduled).
    await vi.waitFor(() => expect(Konva.stages.length).toBe(before));
  });

  it('§8.6 user-wrapped React.act around unmount still drains and does not error', async () => {
    // The render helper's unmount() already wraps in act/flushSync. If user
    // code adds its own React.act wrapper on top (a common testing-library
    // pattern in mixed suites), it must still settle cleanly: no double-flush
    // crash, no leaked stage. This is the "outer act is harmless" contract.
    const result = render(
      <Stage width={50} height={50}>
        <Layer />
      </Stage>
    );
    expect(Konva.stages.length).toBe(1);
    await act(async () => {
      result.unmount();
    });
    await vi.waitFor(() => expect(Konva.stages.length).toBe(0));
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
    // Trigger another reconciliation. Should resolve without throwing.
    // (act returns a Promise; a sync `.toThrow()` would only catch promise-
    // creation throws, not reconciler-side rejections.)
    await expect(act(() => setN(3))).resolves.not.toThrow();
  });
});
