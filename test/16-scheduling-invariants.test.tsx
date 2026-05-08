// §16 — Scheduling invariants (adapted from Polotno team's proposal).
//
// The Polotno team proposed three "invariants" pinning down behavior they
// believe react-konva's HostConfig provides. Their original framing was that
// these would catch regressions in:
//   - `scheduleMicrotask = (fn) => fn();` (sync inline)
//   - `flushSyncFromReconciler` wrapping `updateContainer` in Stage's effect
//
// We received the proposal as a single test file and did a skeptical review
// before adopting. Findings:
//
//   INVARIANT 1 — "Konva refs ready in parent useLayoutEffect"
//     5 tests proposed. All pass on master and under every config we tried
//     (variants A, B, A+B). They overlap heavily with §1.1, §1.4, §1.5, §1.7.
//     KEPT because the scheduling-invariant FRAMING is load-bearing for code
//     review when someone touches HostConfig — these tests are anchors with
//     a clear "if this regresses, you broke X" story, even if they pass under
//     more configs than the Polotno table claimed.
//
//   INVARIANT 2 — "state changes between same-tick DOM events"
//     2 tests proposed using `el.dispatchEvent(new MouseEvent(...))` to
//     synthesize events. DROPPED. The proposed tests FAIL on master (sync
//     scheduleMicrotask + flushSync ON), which contradicts the claimed toggle
//     table. The reason: `dispatchEvent` from JS code goes through React's
//     automatic-batching path, NOT React's discrete-event sync-commit path.
//     We confirmed this is NOT specific to react-konva — pure react-dom
//     `<div onClick>` + `dispatchEvent` also doesn't sync-commit. So those
//     tests can't catch what they claim to catch.
//
//     We then tested the same scenario via `vitest/browser`'s
//     `userEvent.click()` — which dispatches REAL Playwright-driven events
//     through the browser's native event loop. That path DOES go through
//     React's discrete-event handling. Under that path, the polotno scenario
//     passes under BOTH sync and async `scheduleMicrotask`, because real
//     browser events provide enough microtask drain between mousedown and
//     mouseup for the queued reconciler work to flush before mouseup fires.
//
//     Net: the polotno team's INV 2 concern (drag/draw tools breaking under
//     async scheduleMicrotask) does not reproduce with real events. There IS
//     a single real-event-driven anchor test below (§16.2.1) verifying the
//     drag-tool scenario works — but it is NOT a regression test for
//     `scheduleMicrotask = fn => fn()`, because it would pass under async
//     scheduleMicrotask too. It only catches gross breakage.
//
//   INVARIANT 3 — "rapid mount/unmount with pending state, no errors"
//     The polotno team's own note: "we couldn't reproduce a failure for this
//     from tests, so it's a defensive guard." Already covered by §8.5 (50
//     rapid mount/unmount cycles) and §12.1 (1000-cycle loop). DROPPED.
//
// Bottom line: of the polotno team's proposed 8 tests, 5 are kept (INV 1,
// duplicative but worth re-anchoring under scheduling-invariant framing),
// 1 is added (real-event drag-tool anchor), and 2+1 are dropped (broken or
// redundant).

import * as React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { observable } from 'mobx';
import { observer } from 'mobx-react-lite';
import Konva from 'konva';
import { Stage, Layer, Rect, Transformer } from '../src/ReactKonva';
import { render } from './helpers/render';

// ----------------------------------------------------------------------------
// INVARIANT 1: Konva refs are ready when parent useLayoutEffect runs
// ----------------------------------------------------------------------------

describe('§16 INVARIANT 1: Konva refs ready in parent useLayoutEffect', () => {
  it('§16.1.1 Stage forwarded ref is set before parent useLayoutEffect runs', () => {
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

  it('§16.1.2 Konva child node refs are set before parent useLayoutEffect runs', () => {
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

  it('§16.1.3 parent useLayoutEffect can find Konva nodes via stage.findOne()', () => {
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

  it('§16.1.4 after rerender, parent useLayoutEffect sees newly-added Konva nodes', () => {
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

  it('§16.1.5 useLayoutEffect with stable deps gets correct ref on first run', () => {
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
// INVARIANT 2 (rewritten): real-event drag-tool anchor
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// Polotno-team reproducer (their tests C & D verbatim).
// These are functionally identical to §16.1.5 (and §1.5) — same shape: stable
// deps array + useLayoutEffect that bails on a null ref. Kept here under the
// Polotno framing for cross-referencing in their bug reports.
// Both pass on master and under variant A. Both fail under variant A+B.
// ----------------------------------------------------------------------------

describe('§16 Polotno reproducer (test C/D — stable-deps + null-ref guard)', () => {
  it('§16.C stable-deps + null-ref guard, no mobx', async () => {
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
    await new Promise((r) => setTimeout(r, 50));

    expect(effectRunCount).toBeGreaterThan(0);
    expect(observedRef).toBeInstanceOf(Konva.Rect);
  });

  it('§16.D stable-deps + null-ref guard, with mobx observer wrapper', async () => {
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
    await new Promise((r) => setTimeout(r, 50));

    expect(effectRunCount).toBeGreaterThan(0);
    expect(observedRef).toBeInstanceOf(Konva.Rect);
  });
});

describe('§16 INVARIANT 2: drag-tool window-listener pattern (real events)', () => {
  it('§16.2.1 mousedown→useEffect→mouseup chain via real Playwright events', async () => {
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
    const { userEvent } = await import('vitest/browser');
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
