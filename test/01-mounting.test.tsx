// §1 — Mounting / first-paint timing.
// Core invariant: by the time any DOM-side useLayoutEffect runs, the Konva tree
// of every mounted Stage is fully built.

import * as React from 'react';
import { describe, it, expect, vi } from 'vitest';
import Konva from 'konva';
import {
  Stage,
  Layer,
  Rect,
  Group,
  Transformer,
} from '../src/ReactKonva';
import { render, act } from './helpers/render';

describe('§1 mounting / first-paint timing', () => {
  it('§1.1 single Stage parent useLayoutEffect can find Konva children (Transformer)', () => {
    let foundOnLayoutEffect: Konva.Node | null | undefined = undefined;
    const App = () => {
      const stageRef = React.useRef<Konva.Stage>(null);
      React.useLayoutEffect(() => {
        foundOnLayoutEffect = stageRef.current?.findOne('Transformer');
      });
      return (
        <Stage ref={stageRef} width={100} height={100}>
          <Layer>
            <Transformer />
          </Layer>
        </Stage>
      );
    };
    render(<App />);
    expect(foundOnLayoutEffect).toBeInstanceOf(Konva.Transformer);
  });

  it('§1.2 sibling Stages — each parent\'s useLayoutEffect finds its own stage\'s nodes', () => {
    const seen: Record<string, string | undefined> = {};
    const Slot = ({ id, fill }: { id: string; fill: string }) => {
      const stageRef = React.useRef<Konva.Stage>(null);
      React.useLayoutEffect(() => {
        const rect = stageRef.current?.findOne('Rect') as Konva.Rect | undefined;
        seen[id] = rect?.fill();
      });
      return (
        <Stage ref={stageRef} width={50} height={50}>
          <Layer>
            <Rect width={10} height={10} fill={fill} />
          </Layer>
        </Stage>
      );
    };
    render(
      <>
        <Slot id="a" fill="red" />
        <Slot id="b" fill="blue" />
      </>
    );
    expect(seen.a).toBe('red');
    expect(seen.b).toBe('blue');
  });

  it('§1.3 nested under a wrapping component — outer useLayoutEffect still sees Konva nodes', () => {
    let foundCount = -1;
    const Inner = () => (
      <Stage width={50} height={50}>
        <Layer>
          <Rect id="needle" width={10} height={10} />
        </Layer>
      </Stage>
    );
    const Outer = ({ children }: { children: React.ReactNode }) => {
      const ref = React.useRef<HTMLDivElement>(null);
      React.useLayoutEffect(() => {
        const stage = Konva.stages[Konva.stages.length - 1];
        foundCount = stage.find('#needle').length;
      });
      return <div ref={ref}>{children}</div>;
    };
    render(
      <Outer>
        <Inner />
      </Outer>
    );
    expect(foundCount).toBe(1);
  });

  it('§1.4 <Stage ref={...}> is set synchronously on mount — outer useLayoutEffect sees it', () => {
    let observed: Konva.Stage | null = null;
    const App = () => {
      const ref = React.useRef<Konva.Stage>(null);
      React.useLayoutEffect(() => {
        observed = ref.current;
      });
      return (
        <Stage ref={ref} width={100} height={100}>
          <Layer />
        </Stage>
      );
    };
    render(<App />);
    expect(observed).toBeInstanceOf(Konva.Stage);
  });

  it('§1.5 initial Konva node refs — child ref is a real Konva node before parent useLayoutEffect', () => {
    let observedRect: Konva.Rect | null = null;
    const App = () => {
      const rectRef = React.useRef<Konva.Rect>(null);
      React.useLayoutEffect(() => {
        observedRect = rectRef.current;
      });
      return (
        <Stage width={50} height={50}>
          <Layer>
            <Rect ref={rectRef} width={10} height={10} />
          </Layer>
        </Stage>
      );
    };
    render(<App />);
    expect(observedRect).toBeInstanceOf(Konva.Rect);
  });

  it('§1.6 Stage prop changes mid-life — applyNodeProps runs and node sees new value before next paint', () => {
    let observedWidthAfterUpdate = -1;
    const App = ({ width }: { width: number }) => {
      const stageRef = React.useRef<Konva.Stage>(null);
      React.useLayoutEffect(() => {
        observedWidthAfterUpdate = stageRef.current?.width() ?? -1;
      }, [width]);
      return (
        <Stage ref={stageRef} width={width} height={100}>
          <Layer />
        </Stage>
      );
    };
    const { rerender } = render(<App width={100} />);
    expect(observedWidthAfterUpdate).toBe(100);
    act(() => {
      rerender(<App width={250} />);
    });
    expect(observedWidthAfterUpdate).toBe(250);
  });

  it('§1.7 children added after first mount — parent useLayoutEffect (deps on count) sees the new node', () => {
    let observed = -1;
    const App = ({ count }: { count: number }) => {
      const stageRef = React.useRef<Konva.Stage>(null);
      React.useLayoutEffect(() => {
        observed = stageRef.current?.find('Rect').length ?? -1;
      }, [count]);
      return (
        <Stage ref={stageRef} width={100} height={100}>
          <Layer>
            {Array.from({ length: count }, (_, i) => (
              <Rect key={i} width={10} height={10} />
            ))}
          </Layer>
        </Stage>
      );
    };
    const { rerender } = render(<App count={1} />);
    expect(observed).toBe(1);
    act(() => {
      rerender(<App count={3} />);
    });
    expect(observed).toBe(3);
  });

  it('§1.9 keyed reorder with shrinking length — no leaks, correct z-order, instance identity preserved', () => {
    // Adapted from r3f's `'should properly handle array of components with
    // changing keys and order'`. Stresses placeChild/moveChild/removeChild
    // simultaneously. Konva Layer.children is paint-order, so a buggy
    // reorder silently regresses z-order without crashing.
    let setIds!: (xs: number[]) => void;
    const App = ({ ids }: { ids: number[] }) => (
      <Stage width={100} height={100}>
        <Layer>
          {ids.map((id) => (
            <Rect key={id} name={String(id)} width={10} height={10} />
          ))}
        </Layer>
      </Stage>
    );
    const Wrapper = () => {
      const [ids, set] = React.useState([1, 2, 3, 4]);
      setIds = set;
      return <App ids={ids} />;
    };
    const { stage } = render(<Wrapper />);
    const layer = stage()!.findOne('Layer') as Konva.Layer;
    const namesOf = () => layer.getChildren().map((c) => c.name());
    const idOf = (n: string) => (layer.findOne('.' + n) as Konva.Rect)._id;

    expect(namesOf()).toEqual(['1', '2', '3', '4']);
    const initialIds = { '1': idOf('1'), '2': idOf('2'), '3': idOf('3'), '4': idOf('4') };

    // Reorder + drop one.
    act(() => setIds([3, 1, 4]));
    expect(namesOf()).toEqual(['3', '1', '4']);
    // Same Konva.Rect instance per surviving key — proven by stable _id.
    expect(idOf('3')).toBe(initialIds['3']);
    expect(idOf('1')).toBe(initialIds['1']);
    expect(idOf('4')).toBe(initialIds['4']);
    expect(layer.findOne('.2')).toBeUndefined();
    expect(layer.getChildren().length).toBe(3);

    // Reorder + drop another.
    act(() => setIds([4, 1]));
    expect(namesOf()).toEqual(['4', '1']);
    expect(idOf('4')).toBe(initialIds['4']);
    expect(idOf('1')).toBe(initialIds['1']);
    expect(layer.findOne('.3')).toBeUndefined();
    expect(layer.getChildren().length).toBe(2);
  });

  it('§1.8 children removed after first mount — no zombie Konva node remains', () => {
    let observed = -1;
    const App = ({ count }: { count: number }) => {
      const stageRef = React.useRef<Konva.Stage>(null);
      React.useLayoutEffect(() => {
        observed = stageRef.current?.find('Rect').length ?? -1;
      }, [count]);
      return (
        <Stage ref={stageRef} width={100} height={100}>
          <Layer>
            {Array.from({ length: count }, (_, i) => (
              <Rect key={i} width={10} height={10} />
            ))}
          </Layer>
        </Stage>
      );
    };
    const { rerender, stage } = render(<App count={3} />);
    expect(observed).toBe(3);
    act(() => {
      rerender(<App count={1} />);
    });
    expect(observed).toBe(1);
    expect(stage()?.find('Rect').length).toBe(1);
  });

  it('§1.10 react-konva does not overwrite Konva-side prop changes from outside React', () => {
    // If user code mutates a Konva node imperatively (e.g. via drag),
    // a subsequent re-render with the same JSX prop must NOT overwrite that
    // imperative change. Toggled by `useStrictMode` (see §4) — this default
    // behavior is "preserve manual changes".
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

    // Re-render with the SAME JSX x={10} — react-konva must not clobber the 20.
    act(() => rerender(<App x={10} />));
    expect(rect.x()).toBe(20);
  });

  it('§1.11 Konva node ids persist across React re-renders (no remount)', () => {
    // Konva assigns each node an internal `_id`. After re-renders that don't
    // change keys, the same node instance must survive — so its `_id` is stable.
    const App = ({ x }: { x: number }) => (
      <Stage width={100} height={100}>
        <Layer>
          <Rect name="r" width={50} height={50} x={x} />
        </Layer>
      </Stage>
    );
    const { rerender, stage } = render(<App x={0} />);
    const initialId = (stage()!.findOne('.r') as Konva.Rect)._id;
    act(() => rerender(<App x={5} />));
    act(() => rerender(<App x={10} />));
    const laterId = (stage()!.findOne('.r') as Konva.Rect)._id;
    expect(laterId).toBe(initialId);
  });

  it('§1.12 Layer.batchDraw fires on mount', () => {
    const spy = vi.spyOn(Konva.Layer.prototype, 'batchDraw');
    try {
      render(
        <Stage width={50} height={50}>
          <Layer>
            <Rect width={10} height={10} fill="red" />
          </Layer>
        </Stage>
      );
      expect(spy).toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });

  it('§1.13 Layer.batchDraw fires when a node is added', () => {
    const App = ({ show }: { show: boolean }) => (
      <Stage width={50} height={50}>
        <Layer>{show && <Rect width={10} height={10} fill="red" />}</Layer>
      </Stage>
    );
    const { rerender } = render(<App show={false} />);
    const spy = vi.spyOn(Konva.Layer.prototype, 'batchDraw');
    try {
      act(() => rerender(<App show={true} />));
      expect(spy).toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });

  it('§1.14 Layer.batchDraw fires when a node is removed', () => {
    const App = ({ hide }: { hide: boolean }) => (
      <Stage width={50} height={50}>
        <Layer>{!hide && <Rect width={10} height={10} fill="red" />}</Layer>
      </Stage>
    );
    const { rerender } = render(<App hide={false} />);
    const spy = vi.spyOn(Konva.Layer.prototype, 'batchDraw');
    try {
      act(() => rerender(<App hide={true} />));
      expect(spy).toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });
});
