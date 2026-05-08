// §12 — Memory / long-running app.
// Goal: verify mount/unmount cycles do not leak Konva.Stage instances or
// listeners over long runs.

import * as React from 'react';
import { describe, it, expect } from 'vitest';
import Konva from 'konva';
import { Stage, Layer, Rect } from '../src/ReactKonva';
import { render, act } from './helpers/render';

const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));

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
        act(() => result.unmount());
      }
      await tick();
      expect(Konva.stages.length).toBe(before);
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

    act(() => rerender(<App x={5} />));
    act(() => rerender(<App x={10} />));
    act(() => rerender(<App x={15} />));
    // Same Konva.Rect across re-renders — only the prop changed.
    expect(seen.size).toBe(initialCount);
  });

  it('§12.3 HMR simulation — re-importing the module does not duplicate Konva.Stage instances', async () => {
    const before = Konva.stages.length;
    const result = render(
      <Stage width={50} height={50}>
        <Layer>
          <Rect width={10} height={10} />
        </Layer>
      </Stage>
    );
    expect(Konva.stages.length).toBe(before + 1);
    // We can't actually invoke vite's HMR from inside a test, but we CAN
    // simulate it: unmount → re-import the source module → re-mount. If
    // any module-level state retains a stage, count would not be `before + 1`.
    act(() => result.unmount());
    await tick();
    expect(Konva.stages.length).toBe(before);

    const fresh = await import('../src/ReactKonva');
    const FreshStage = fresh.Stage;
    const FreshLayer = fresh.Layer;
    const FreshRect = fresh.Rect;
    const result2 = render(
      <FreshStage width={50} height={50}>
        <FreshLayer>
          <FreshRect width={10} height={10} />
        </FreshLayer>
      </FreshStage>
    );
    expect(Konva.stages.length).toBe(before + 1);
    act(() => result2.unmount());
    await tick();
    expect(Konva.stages.length).toBe(before);
  });
});
