// §7 — mobx-react-lite × secondary-reconciler snapshot race.
//
// Why mobx in a renderer test suite? react-konva itself is state-library
// agnostic — users wire it up with mobx, redux, zustand, plain useState,
// signals, anything. We don't take a position. The mobx case earns a
// dedicated test because the Polotno team hit a real, hard-to-diagnose
// scheduling bug where react-konva's secondary reconciler interleaved with
// mobx-react-lite's deferred snapshot bump, producing stale Konva trees on
// state changes that would have rendered cleanly under react-dom. This
// test is the safeguard: it pins react-konva's commit timing close enough
// to react-dom's that mobx's standard `useSyncExternalStore` integration
// works the same way under both renderers.
//
// Mechanism: mobx-react-lite defers its `useSyncExternalStore` snapshot
// bump (`adm.stateVersion = Symbol()`) to a queued handler gated by
// `shouldCompute()`. If anything re-renders the observer between
// `onBecomeStale_` and `runReaction_`, the render's `reaction.track()`
// resets deps to UP_TO_DATE_, `shouldCompute` returns false, the handler
// skips, the Symbol stays stale, React's `useSyncExternalStore` bails out,
// and the JSX update is discarded — leaving a stale Konva subtree.
//
// react-konva's scheduling can drive that interleaved re-render. With async
// `scheduleMicrotask` (current), the secondary reconciler defers past the
// race window; mobx's queued handler runs first, the Symbol bumps, and the
// observer re-renders cleanly. This test guards against any scheduling
// regression that would re-unmask the bug.

import * as React from 'react';
import { it, expect, beforeEach, vi } from 'vitest';
import { observable, runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import { Stage, Layer, Rect, Group } from '../src/ReactKonva';
import { render } from './helpers/render';
import { focusRectsOnCanvas } from './helpers/konva-helpers';

const FOCUS_STROKE = '#0d83dd';

interface Store {
  selected: boolean;
  focusedId: string | null;
}

let store: Store;
beforeEach(() => {
  store = observable({
    selected: false,
    focusedId: null,
  });
});

// Regression test for the async `scheduleMicrotask` decision in
// ReactKonvaHostConfig.ts. Reverting to sync makes this test fail with a
// lingering focus rect (the mobx race described in the file header).
it('§7 focus rect disappears when an observable flips off (no stale snapshot)', async () => {
  const FocusBox = observer(() => {
    const isSelected = store.selected;
    const focusedId = store.focusedId;

    // useState held in the same observer that mutates `focusedId` in its
    // useEffect. The non-equal setHover dispatch is what schedules the
    // interleaved re-render that races with mobx's queued reaction handler.
    const [, setHover] = React.useState<string | null>('init');

    React.useEffect(() => {
      if (!isSelected) {
        runInAction(() => {
          store.focusedId = null;
        });
        setHover(null);
      }
    }, [isSelected]);

    return (
      <Group>
        <Rect x={0} y={0} width={50} height={50} fill="white" />
        {focusedId && (
          <Rect
            key={`focus-${focusedId}`}
            x={0}
            y={0}
            width={50}
            height={50}
            stroke={FOCUS_STROKE}
            strokeWidth={2}
            listening={false}
          />
        )}
      </Group>
    );
  });

  const App = () => (
    <Stage width={200} height={200}>
      <Layer>
        <FocusBox />
      </Layer>
    </Stage>
  );

  render(<App />);

  runInAction(() => {
    store.selected = true;
    store.focusedId = 'a';
  });
  await vi.waitFor(() =>
    expect(focusRectsOnCanvas(FOCUS_STROKE).length).toBe(1)
  );

  runInAction(() => {
    store.selected = false;
  });
  await vi.waitFor(() => {
    expect(store.focusedId).toBe(null);
    expect(focusRectsOnCanvas(FOCUS_STROKE).length).toBe(0);
  });
});
