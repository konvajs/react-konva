// §4 — StrictMode.
// React's dev-mode double-invocation must not leak Konva nodes or break refs.
// Note: production React strips StrictMode's double-invoke, so the prod-matrix
// run of this file mostly verifies that the same surface still holds with the
// double-invoke disabled.

import * as React from 'react';
import { flushSync } from 'react-dom';
import { describe, it, expect, vi } from 'vitest';
import Konva from 'konva';
import { FiberProvider } from 'its-fine';
import { Stage, Layer, Rect, useStrictMode } from '../src/ReactKonva';
import { render } from './helpers/render';

describe('§4 StrictMode', () => {
  it('inherits StrictMode render checks from the DOM tree', () => {
    const domInitializer = vi.fn(() => 1);
    const canvasInitializer = vi.fn(() => 1);
    const domMemo = vi.fn(() => 10);
    const canvasMemo = vi.fn(() => 10);
    const Content = ({ canvas = false }) => {
      const [count] = React.useState(canvas ? canvasInitializer : domInitializer);
      const x = React.useMemo(canvas ? canvasMemo : domMemo, []);
      return canvas ? <Rect x={count + x} /> : <span>{count + x}</span>;
    };
    render(
      <React.StrictMode>
        <Content />
        <Stage width={50} height={50}><Layer><Content canvas /></Layer></Stage>
      </React.StrictMode>,
    );
    const expected = process.env.NODE_ENV === 'production' ? 1 : 2;
    expect(domInitializer).toHaveBeenCalledTimes(expected);
    expect(domMemo).toHaveBeenCalledTimes(expected);
    expect(canvasInitializer).toHaveBeenCalledTimes(expected);
    expect(canvasMemo).toHaveBeenCalledTimes(expected);
  });

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
    const view = render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    const stage = view.stage();
    expect(calls).toEqual(
      process.env.NODE_ENV === 'production' ? [stage] : [stage, null, stage]
    );
    expect(calls[calls.length - 1]).toBeInstanceOf(Konva.Stage);
    view.unmount();
    expect(calls[calls.length - 1]).toBeNull();
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
  // settles to a live Stage), §4.6 (no duplicate event listeners).

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

  it.each(['native input', 'DOM flush'])(
    '§4.7 unmount discards pending child state after %s',
    async (trigger) => {
      const events: string[] = [];
      let updateChild: () => void;
      let hideStage: () => void;
      const remove = () => {
        updateChild();
        hideStage();
      };
      const Child = () => {
        const [width, setWidth] = React.useState(100);
        updateChild = () => setWidth(200);
        events.push(`child render ${width}`);
        React.useLayoutEffect(() => {
          return () => {
            events.push('child cleanup');
          };
        }, []);
        return <Rect width={width} height={20} />;
      };
      const Scene = () => {
        React.useLayoutEffect(() => {
          return () => {
            events.push('parent cleanup');
          };
        }, []);
        return (
          <Stage width={300} height={300} onMouseDown={remove}>
            <Layer>
              <Child />
            </Layer>
          </Stage>
        );
      };
      const Parent = () => {
        const [visible, setVisible] = React.useState(true);
        hideStage = () => setVisible(false);
        return visible ? <Scene /> : null;
      };
      const view = render(
        <React.StrictMode>
          <Parent />
        </React.StrictMode>
      );
      // Let mount scheduling drain before testing a new input task. Wrapping
      // the input in act would hide the production scheduling order.
      await new Promise((resolve) => setTimeout(resolve, 0));
      events.length = 0;

      if (trigger === 'native input') {
        view.stage()!.simulateMouseDown({ x: 5, y: 5 });
      } else {
        flushSync(remove);
      }

      await vi.waitFor(() => expect(events).toContain('child cleanup'));
      expect(view.container.children).toHaveLength(0);
      expect(events).toEqual(['parent cleanup', 'child cleanup']);
    },
  );

  it('§4.8 preserves sibling Stage child state through StrictMode effect replay', () => {
    const rects = [React.createRef<Konva.Rect>(), React.createRef<Konva.Rect>()];
    const firstNodes: Konva.Rect[] = [];
    const updates: (() => void)[] = [];
    const Child = ({ index }: { index: number }) => {
      const [width, setWidth] = React.useState(100);
      updates[index] = () => setWidth(200);
      React.useLayoutEffect(() => {
        firstNodes[index] ??= rects[index].current!;
      }, []);
      return <Rect ref={rects[index]} width={width} height={20} />;
    };
    const Parent = () => {
      const initialized = React.useRef(false);
      React.useLayoutEffect(() => {
        if (!initialized.current) {
          initialized.current = true;
          updates.forEach((update) => update());
        }
      }, []);
      return (
        <>
          {rects.map((_, index) => (
            <Stage key={index} width={300} height={300}>
              <Layer>
                <Child index={index} />
              </Layer>
            </Stage>
          ))}
        </>
      );
    };

    render(
      <React.StrictMode>
        <Parent />
      </React.StrictMode>
    );
    rects.forEach((ref, index) => {
      expect(ref.current!.width()).toBe(200);
      expect(ref.current).toBe(firstNodes[index]);
    });
  });

  it('§4.9 discards child work when a hidden Stage is deleted in the same task', async () => {
    const events: string[] = [];
    let change: () => void;
    let hide: () => void;
    let remove: () => void;
    const Child = () => {
      const [width, setWidth] = React.useState(100);
      change = () => setWidth(200);
      events.push(`render ${width}`);
      React.useLayoutEffect(() => {
        return () => {
          events.push('child cleanup');
        };
      }, []);
      return <Rect width={width} height={20} />;
    };
    const Parent = () => {
      const [visible, setVisible] = React.useState(true);
      const [mounted, setMounted] = React.useState(true);
      hide = () => setVisible(false);
      remove = () => setMounted(false);
      return mounted ? (
        <React.Activity mode={visible ? 'visible' : 'hidden'}>
          <Stage width={300} height={300}>
            <Layer>
              <Child />
            </Layer>
          </Stage>
        </React.Activity>
      ) : null;
    };
    const view = render(
      <React.StrictMode>
        <Parent />
      </React.StrictMode>
    );
    // Start after mount scheduling settles, then hide and delete in one task.
    await new Promise((resolve) => setTimeout(resolve, 0));
    events.length = 0;
    flushSync(() => hide());
    flushSync(() => {
      change();
      remove();
    });

    await vi.waitFor(() => expect(events).toContain('child cleanup'));
    expect(view.container.children).toHaveLength(0);
    expect(events).toEqual(['child cleanup']);
  });
});
