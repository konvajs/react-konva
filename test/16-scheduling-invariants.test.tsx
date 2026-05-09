// §16 — Scheduling invariants.
// Anchor tests pinning the scheduling-contract framing for code reviews
// touching HostConfig. INV 1 (Konva refs ready in parent useLayoutEffect)
// duplicates §1 but under scheduling-invariant naming. INV 2 (drag-tool
// window-listener pattern) uses real Playwright events — synthetic
// dispatchEvent from JS goes through React's automatic-batching path, not
// the discrete-event sync-commit path, so it can't catch what the polotno
// team's original dispatchEvent-based tests claimed.

import * as React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { observable } from 'mobx';
import { observer } from 'mobx-react-lite';
import Konva from 'konva';
import { Stage, Layer, Rect, Transformer } from '../src/ReactKonva';
import { render } from './helpers/render';

// ----------------------------------------------------------------------------
// INVARIANT 1: Konva refs are ready when parent useLayoutEffect runs
// ----------------------------------------------------------------------------

describe('§16 INVARIANT 1: Konva refs ready in parent useLayoutEffect', () => {
  it('§16.1 Stage forwarded ref is set before parent useLayoutEffect runs', () => {
    let observed: Konva.Stage | null = null;
    const stageRef = React.createRef<Konva.Stage>();
    const App = () => {
      React.useLayoutEffect(() => {
        observed = stageRef.current;
      });
      return (
        <Stage ref={stageRef} width={100} height={100}>
          <Layer>
            <Rect width={50} height={50} />
          </Layer>
        </Stage>
      );
    };
    render(<App />);
    expect(observed).toBeInstanceOf(Konva.Stage);
  });

  it('§16.2 Konva child node refs are set before parent useLayoutEffect runs', () => {
    let observed: Konva.Rect | null = null;
    const rectRef = React.createRef<Konva.Rect>();
    const App = () => {
      React.useLayoutEffect(() => {
        observed = rectRef.current;
      });
      return (
        <Stage width={100} height={100}>
          <Layer>
            <Rect ref={rectRef} width={50} height={50} />
          </Layer>
        </Stage>
      );
    };
    render(<App />);
    expect(observed).toBeInstanceOf(Konva.Rect);
  });

  it('§16.3 parent useLayoutEffect can find Konva nodes via stage.findOne()', () => {
    let found = false;
    const stageRef = React.createRef<Konva.Stage>();
    const App = () => {
      React.useLayoutEffect(() => {
        found = !!stageRef.current?.findOne('Transformer');
      });
      return (
        <Stage ref={stageRef} width={100} height={100}>
          <Layer>
            <Rect width={50} height={50} />
            <Transformer />
          </Layer>
        </Stage>
      );
    };
    render(<App />);
    expect(found).toBe(true);
  });

  it('§16.4 after rerender, parent useLayoutEffect sees newly-added Konva nodes', () => {
    let rectsAtLayoutEffect = -1;
    const stageRef = React.createRef<Konva.Stage>();
    const App = ({ count }: { count: number }) => {
      React.useLayoutEffect(() => {
        rectsAtLayoutEffect = stageRef.current?.find('Rect').length ?? -1;
      });
      return (
        <Stage ref={stageRef} width={100} height={100}>
          <Layer>
            {Array.from({ length: count }, (_, i) => (
              <Rect key={i} width={20} height={20} x={i * 10} />
            ))}
          </Layer>
        </Stage>
      );
    };
    const { rerender } = render(<App count={1} />);
    expect(rectsAtLayoutEffect).toBe(1);
    rerender(<App count={5} />);
    expect(rectsAtLayoutEffect).toBe(5);
  });

  it('§16.5 useLayoutEffect with stable deps gets correct ref on first run', () => {
    // Polotno bug pattern: imperative ref usage inside a useLayoutEffect whose
    // deps come from a memoized/stable upstream value. If the ref is null on
    // first run, the effect never re-runs (deps don't change) and the
    // imperative wiring never happens — silent visual bug.
    let observed: Konva.Node | null = null;
    const stageRef = React.createRef<Konva.Stage>();
    const STABLE_DEPS: unknown[] = [];
    const App = () => {
      React.useLayoutEffect(() => {
        observed = stageRef.current?.findOne('Transformer') ?? null;
      }, STABLE_DEPS);
      return (
        <Stage ref={stageRef} width={100} height={100}>
          <Layer>
            <Rect width={50} height={50} />
            <Transformer />
          </Layer>
        </Stage>
      );
    };
    render(<App />);
    expect(observed).toBeInstanceOf(Konva.Transformer);
  });
});

// ----------------------------------------------------------------------------
// Polotno-team reproducer. Functionally identical to §16.5 (and §1.5) — same
// shape: useLayoutEffect with a stable deps array (no re-run after first
// commit) and a null-ref guard. Kept under the Polotno framing because their
// bug reports reference these as "tests C and D" — easier to cross-link than
// to renumber the world. The mobx variant exists separately because the
// observer wrapper changed render timing in their original repro.
// ----------------------------------------------------------------------------

describe('§16 Polotno reproducer (stable-deps + null-ref guard)', () => {
  it('§16.6 stable-deps + null-ref guard, no mobx', async () => {
    let observedRef: Konva.Rect | null = null;
    let effectRunCount = 0;
    const STABLE: unknown[] = [];

    const App = () => {
      const rectRef = React.useRef<Konva.Rect>(null);
      React.useLayoutEffect(() => {
        effectRunCount++;
        if (!rectRef.current) return;
        observedRef = rectRef.current;
      }, STABLE);
      return (
        <Stage width={100} height={100}>
          <Layer>
            <Rect ref={rectRef} width={50} height={50} fill="red" />
          </Layer>
        </Stage>
      );
    };
    render(<App />);
    await vi.waitFor(() => {
      expect(effectRunCount).toBeGreaterThan(0);
      expect(observedRef).toBeInstanceOf(Konva.Rect);
    });
  });

  it('§16.7 stable-deps + null-ref guard, with mobx observer wrapper', async () => {
    let observedRef: Konva.Rect | null = null;
    let effectRunCount = 0;
    const store = observable({ tick: 0 });

    const App = observer(() => {
      const rectRef = React.useRef<Konva.Rect>(null);
      const tick = store.tick;
      React.useLayoutEffect(() => {
        effectRunCount++;
        if (!rectRef.current) return;
        observedRef = rectRef.current;
      }, [tick]);
      return (
        <Stage width={100} height={100}>
          <Layer>
            <Rect ref={rectRef} width={50} height={50} fill="red" />
          </Layer>
        </Stage>
      );
    });
    render(<App />);
    await vi.waitFor(() => {
      expect(effectRunCount).toBeGreaterThan(0);
      expect(observedRef).toBeInstanceOf(Konva.Rect);
    });
  });
});

describe('§16 INVARIANT 2: drag-tool window-listener pattern (real events)', () => {
  it('§16.8 mousedown→useEffect→mouseup chain via real Playwright events', async () => {
    // Polotno's drag-tool concern, driven via REAL events (Playwright
    // userEvent), not synthetic dispatchEvent. The test that the original
    // polotno proposal used (`el.dispatchEvent(new MouseEvent(...))`) does
    // NOT trigger React's discrete-event sync-commit path — it goes through
    // automatic batching, which doesn't sync-commit. We verified this is true
    // even without react-konva in the tree, so dispatchEvent-based tests
    // can't catch what the polotno proposal claimed.
    //
    // userEvent.click() drives a REAL mousedown + mouseup pair through the
    // browser's natural event loop. Real events have enough microtask drain
    // between them for queued effects to fire — meaning this test passes
    // under BOTH sync and async scheduleMicrotask. It is NOT a regression
    // test for the scheduleMicrotask change. It only catches gross breakage
    // of the drag-tool pattern.
    const handlerFired = vi.fn();
    let target: HTMLElement | null = null;
    const App = () => {
      const [active, setActive] = React.useState(false);
      React.useEffect(() => {
        if (!active) return;
        const onUp = () => {
          handlerFired();
          setActive(false);
        };
        window.addEventListener('mouseup', onUp);
        return () => window.removeEventListener('mouseup', onUp);
      }, [active]);
      return (
        <div
          ref={(el) => {
            target = el;
          }}
          onMouseDown={() => setActive(true)}
          style={{ width: 100, height: 100, background: 'red' }}
        >
          <Stage width={100} height={100}>
            <Layer>
              <Rect width={50} height={50} />
            </Layer>
          </Stage>
        </div>
      );
    };
    render(<App />);
    await userEvent.click(target!);
    expect(handlerFired).toHaveBeenCalledTimes(1);
  });
});
