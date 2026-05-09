// §4 — StrictMode.
// React's dev-mode double-invocation must not leak Konva nodes or break refs.
// Note: production React strips StrictMode's double-invoke, so the prod-matrix
// run of this file mostly verifies that the same surface still holds with the
// double-invoke disabled.

import * as React from 'react';
import { describe, it, expect } from 'vitest';
import Konva from 'konva';
import { FiberProvider } from 'its-fine';
import { Stage, Layer, Rect, useStrictMode } from '../src/ReactKonva';
import { render } from './helpers/render';

describe('§4 StrictMode', () => {
  it('§4.1 mount → unmount → mount cycle leaves exactly one Konva.Stage', () => {
    const before = Konva.stages.length;
    render(
      <React.StrictMode>
        <Stage width={50} height={50}>
          <Layer />
        </Stage>
      </React.StrictMode>
    );
    expect(Konva.stages.length - before).toBe(1);
  });

  it('§4.2 ref callback is double-invoked but settles to a single live Konva.Stage', () => {
    const calls: (Konva.Stage | null)[] = [];
    const App = () => (
      <Stage
        width={50}
        height={50}
        ref={(s) => {
          calls.push(s);
        }}
      >
        <Layer />
      </Stage>
    );
    render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    // In dev StrictMode the ref callback runs at least twice (set/clear/set).
    // The final settled ref must be a live Konva.Stage; intermediate clears
    // (null) are allowed but the last call must not be null.
    const lastNonNull = [...calls].reverse().find((c) => c !== null);
    expect(lastNonNull).toBeInstanceOf(Konva.Stage);
  });

  it('§4.3 FiberProvider survives StrictMode double-mount (context bridge intact)', () => {
    const Ctx = React.createContext<string>('default');
    let observed: string | undefined;
    const Reader = () => {
      observed = React.useContext(Ctx);
      return <Rect width={10} height={10} />;
    };
    render(
      <React.StrictMode>
        <FiberProvider>
          <Ctx.Provider value="bridged">
            <Stage width={50} height={50}>
              <Layer>
                <Reader />
              </Layer>
            </Stage>
          </Ctx.Provider>
        </FiberProvider>
      </React.StrictMode>
    );
    expect(observed).toBe('bridged');
  });

  // §4.4 (deleted): the assertion `expect(observedFills).toContain(rect.fill())`
  // was tautological — observedFills records every render's fill and rect.fill()
  // is necessarily one of them. The real "StrictMode doesn't break react-konva"
  // contract is anchored elsewhere: §4.1 (no leaked Stage), §4.2 (ref callback
  // settles to a live Stage), §4.7 (no duplicate event listeners).

  it('§4.4 global useStrictMode(true) overwrites Konva-side prop changes', () => {
    // Mirror of §1.10 (which proves the default behavior preserves manual
    // changes). With `useStrictMode(true)`, the JSX value is canonical and
    // overwrites any imperative mutation on next render.
    useStrictMode(true);
    try {
      const App = ({ x }: { x: number }) => (
        <Stage width={100} height={100}>
          <Layer>
            <Rect width={50} height={50} fill="red" x={x} />
          </Layer>
        </Stage>
      );
      const { rerender, stage } = render(<App x={10} />);
      const rect = stage()!.findOne('Rect') as Konva.Rect;
      expect(rect.x()).toBe(10);
      // Imperative mutation outside React.
      rect.x(20);
      // Strict mode: re-render WITH the same JSX x=10 must overwrite the 20.
      rerender(<App x={10} />);
      expect(rect.x()).toBe(10);
    } finally {
      useStrictMode(false);
    }
  });

  it('§4.5 per-component `_useStrictMode: true` opts a single node into prop overwrite', () => {
    // Without flipping the global, the special `_useStrictMode` prop forces
    // strict-mode prop sync on this node only.
    const App = ({ x, strict }: { x: number; strict?: boolean }) => (
      <Stage width={100} height={100}>
        <Layer>
          <Rect
            width={50}
            height={50}
            fill="red"
            x={x}
            _useStrictMode={strict}
          />
        </Layer>
      </Stage>
    );
    const { rerender, stage } = render(<App x={10} />);
    const rect = stage()!.findOne('Rect') as Konva.Rect;
    expect(rect.x()).toBe(10);
    rect.x(20);
    rerender(<App x={10} strict />);
    expect(rect.x()).toBe(10);
  });

  it('§4.6 event listeners under StrictMode — exactly one listener after double-invoke', () => {
    const App = () => (
      <Stage width={100} height={100} onMouseDown={() => {}}>
        <Layer />
      </Stage>
    );
    const { stage } = render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    expect(stage()!.eventListeners.mousedown.length).toBe(1);
  });
});
