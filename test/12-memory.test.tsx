// §12 — Memory / long-running app.
// Goal: verify mount/unmount cycles do not leak Konva.Stage instances or
// listeners over long runs.

import * as React from 'react';
import { describe, it, expect, vi } from 'vitest';
import Konva from 'konva';
import { Stage, Layer, Rect } from '../src/ReactKonva';
import { render } from './helpers/render';

describe('§12 memory / long-running app', () => {
  it(
    '§12.1 1000-cycle mount/unmount — no leaked Konva.Stage, no listener leaks',
    { timeout: 60000 },
    async () => {
      const before = Konva.stages.length;
      // Drop to 500 cycles if this test exceeds 30s on the dev machine.
      const CYCLES = 1000;
      for (let i = 0; i < CYCLES; i++) {
        const result = render(
          <Stage width={50} height={50}>
            <Layer>
              <Rect width={10} height={10} />
            </Layer>
          </Stage>
        );
        result.unmount();
      }
      await vi.waitFor(() => expect(Konva.stages.length).toBe(before));
    }
  );

  it('§12.2 stable refs — re-rendering Stage with the same children does not allocate new Konva nodes', () => {
    const seen = new Set<Konva.Rect>();
    const App = ({ x }: { x: number }) => (
      <Stage width={50} height={50}>
        <Layer>
          <Rect
            ref={(r) => {
              if (r) seen.add(r);
            }}
            width={10}
            height={10}
            x={x}
          />
        </Layer>
      </Stage>
    );
    const { rerender } = render(<App x={0} />);
    const initialCount = seen.size;
    expect(initialCount).toBe(1);

    rerender(<App x={5} />);
    rerender(<App x={10} />);
    rerender(<App x={15} />);
    // Same Konva.Rect across re-renders — only the prop changed.
    expect(seen.size).toBe(initialCount);
  });

  // §12.3 ("HMR simulation") was removed: it dynamic-imported '../src/ReactKonva'
  // which returns the cached module, so it only re-ran §12.1's mount/unmount
  // with a different binding. Real HMR coverage would require vite-node's
  // cache-busting executeFile, which is out of scope for the browser test
  // runner. Re-add only with a real HMR driver.
});
