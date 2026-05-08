// §7 — mobx-react-lite × secondary-reconciler snapshot race.
//
// mobx-react-lite defers its `useSyncExternalStore` snapshot bump
// (`adm.stateVersion = Symbol()`) to a queued handler gated by
// `shouldCompute()`. If anything re-renders the observer between
// `onBecomeStale_` and `runReaction_`, the render's `reaction.track()` resets
// deps to UP_TO_DATE_, `shouldCompute` returns false, the handler skips, the
// Symbol stays stale, React's `useSyncExternalStore` bails out, and the JSX
// update is discarded — leaving a stale Konva subtree.
//
// react-konva's scheduling can drive that interleaved re-render. With async
// `scheduleMicrotask` (current), the secondary reconciler defers past the
// race window; mobx's queued handler runs first, the Symbol bumps, and the
// observer re-renders cleanly. This test guards against any scheduling
// regression that would re-unmask the bug.

import * as React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { observable, runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import { Stage, Layer, Rect, Group } from '../src/ReactKonva';
import { render } from './helpers/render';
import { makeBuggyStore } from './helpers/buggy-store';
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

describe('§7 mobx-react-lite × react-konva snapshot race', () => {
  // Passes under react-konva's current scheduling: async `scheduleMicrotask`
  // defers the secondary reconciler's commit past the moment when mobx's
  // interleaved render would have triggered the `shouldCompute=false` gate,
  // so the version Symbol bumps correctly and `useSyncExternalStore` does
  // NOT bail out. Without that scheduling change, this test reproduces the
  // race and fails (focus rect lingers).
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
    await new Promise((r) => setTimeout(r, 50));
    expect(focusRectsOnCanvas(FOCUS_STROKE).length).toBe(1);

    runInAction(() => {
      store.selected = false;
    });
    await new Promise((r) => setTimeout(r, 200));

    expect(store.focusedId).toBe(null);
    // Without the fix this is 1, leaving a stale focus stroke on the canvas.
    expect(focusRectsOnCanvas(FOCUS_STROKE).length).toBe(0);
  });
});

describe('§7 synthetic snapshot-race (no mobx)', () => {
  // Same React-side bailout as the mobx race, but driven by a hand-rolled
  // store whose `skipBump` path mutates state without bumping the snapshot
  // version — directly exercising React's `useSyncExternalStore`
  // `Object.is`-on-snapshot bailout. Marked `.fails` for the same reason as
  // the mobx test above: the assertion documents the desired behavior; the
  // actual current behavior is a stale Konva tree.
  it.fails(
    'focus rect should disappear even when the store skips the version bump',
    async () => {
      const store = makeBuggyStore();

      const FocusBox = () => {
        React.useSyncExternalStore(store.subscribe, store.getSnapshot);
        const data = store.getData();
        const [, setHover] = React.useState<string | null>('init');

        React.useEffect(() => {
          if (!data.selected) {
            store.set({ focusedId: null }, { skipBump: true });
            setHover(null);
          }
        }, [data.selected]);

        return (
          <Group>
            <Rect x={0} y={0} width={50} height={50} fill="white" />
            {data.focusedId && (
              <Rect
                key={`focus-${data.focusedId}`}
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
      };

      render(
        <Stage width={200} height={200}>
          <Layer>
            <FocusBox />
          </Layer>
        </Stage>
      );

      store.set({ selected: true, focusedId: 'a' });
      await new Promise((r) => setTimeout(r, 50));
      expect(focusRectsOnCanvas(FOCUS_STROKE).length).toBe(1);

      store.set({ selected: false });
      await new Promise((r) => setTimeout(r, 200));

      expect(store.getSnapshot().focusedId).toBe(null);
      expect(focusRectsOnCanvas(FOCUS_STROKE).length).toBe(0);
    }
  );
});
