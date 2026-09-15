// §2 — React 19 scheduler / lanes.
// What lane does work land on, and what guarantees hold per lane?

import * as React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { flushSync } from 'react-dom';
import Konva from 'konva';
import { Stage, Layer, Rect } from '../src/ReactKonva';
import { render, act } from './helpers/render';

describe('§2 scheduler / lanes', () => {
  it('§2.1 startTransition wrapping a Konva-mutating state change eventually commits', async () => {
    let setFill!: (next: string) => void;
    const App = () => {
      const [fill, set] = React.useState('red');
      setFill = set;
      return (
        <Stage width={50} height={50}>
          <Layer>
            <Rect width={20} height={20} fill={fill} />
          </Layer>
        </Stage>
      );
    };
    const { stage } = render(<App />);
    expect((stage()!.findOne('Rect') as Konva.Rect).fill()).toBe('red');

    React.startTransition(() => setFill('blue'));
    await vi.waitFor(() =>
      expect((stage()!.findOne('Rect') as Konva.Rect).fill()).toBe('blue')
    );
  });

  it('§2.2 sync update can interrupt a transition without leaving partial state', async () => {
    let setFillTransition!: (next: string) => void;
    let setFillSync!: (next: string) => void;
    const App = () => {
      const [fillT, setT] = React.useState('red');
      const [fillS, setS] = React.useState<string | null>(null);
      setFillTransition = setT;
      setFillSync = setS;
      const fill = fillS ?? fillT;
      return (
        <Stage width={50} height={50}>
          <Layer>
            <Rect width={20} height={20} fill={fill} />
          </Layer>
        </Stage>
      );
    };
    const { stage } = render(<App />);

    React.startTransition(() => setFillTransition('blue'));
    // Sync (discrete) update interrupts before the transition commits.
    flushSync(() => setFillSync('green'));
    // Final state must be the high-priority color, not partial.
    await vi.waitFor(() =>
      expect((stage()!.findOne('Rect') as Konva.Rect).fill()).toBe('green')
    );
  });

  it('§2.3 useTransition `isPending` flips around a Konva-only update', async () => {
    let release!: () => void;
    const Canvas = () => {
      const [n, set] = React.useState(0);
      const [isPending, startT] = React.useTransition();
      return (
        <Rect width={20} height={20} x={n} name={String(isPending)}
          onClick={() => startT(async () => {
            React.addTransitionType('move');
            await new Promise<void>((resolve) => { release = resolve; });
            startT(() => set(10));
          })}
        />
      );
    };
    const { stage } = render(
      <Stage width={50} height={50}><Layer><Canvas /></Layer></Stage>,
    );
    const rect = stage()!.findOne('Rect')!;
    expect(rect.name()).toBe('false');
    await act(() => rect.fire('click'));
    await vi.waitFor(() => expect(rect.name()).toBe('true'));
    expect(rect.x()).toBe(0);
    await act(() => release());
    await vi.waitFor(() => {
      expect(rect.name()).toBe('false');
      expect(rect.x()).toBe(10);
    });
  });

  it('§2.4 useDeferredValue keeps the old canvas content while new content suspends', async () => {
    let release!: () => void;
    const ready = new Promise<void>((resolve) => { release = resolve; });
    const Result = ({ x }: { x: number }) => {
      if (x === 123) React.use(ready);
      return <Rect name="result" x={x} />;
    };
    const Canvas = () => {
      const [x, set] = React.useState(0);
      const deferred = React.useDeferredValue(x);
      return (
        <>
          <Rect name="input" x={x} onClick={() => set(123)} />
          <React.Suspense fallback={<Rect name="fallback" />}>
            <Result x={deferred} />
          </React.Suspense>
        </>
      );
    };
    const { stage } = render(
      <Stage width={200} height={50}><Layer><Canvas /></Layer></Stage>,
    );
    const result = stage()!.findOne('.result')!;
    await act(() => stage()!.findOne('.input')!.fire('click'));
    await vi.waitFor(() => expect(stage()!.findOne('.input')!.x()).toBe(123));
    expect(result.x()).toBe(0);
    expect(result.visible()).toBe(true);
    expect(stage()!.findOne('.fallback')).toBeUndefined();
    await act(() => release());
    await vi.waitFor(() => expect(result.x()).toBe(123));
    expect(stage()!.findOne('.result')).toBe(result);
  });

  it('§2.5 flushSync from react-dom commits Konva work inside the call', () => {
    let setX!: (n: number) => void;
    let stageRef!: Konva.Stage;
    const App = () => {
      const [x, set] = React.useState(0);
      setX = set;
      const ref = React.useRef<Konva.Stage>(null);
      React.useLayoutEffect(() => {
        if (ref.current) stageRef = ref.current;
      });
      return (
        <Stage ref={ref} width={200} height={50}>
          <Layer>
            <Rect width={20} height={20} x={x} />
          </Layer>
        </Stage>
      );
    };
    render(<App />);
    flushSync(() => setX(77));
    // Inside the same tick — Konva node MUST reflect the new value.
    expect((stageRef!.findOne('Rect') as Konva.Rect).x()).toBe(77);
  });

  it('§2.6 high-priority sync update wins over scheduled transition', async () => {
    let setT!: (s: string) => void;
    let setSync!: (s: string) => void;
    const App = () => {
      const [t, setTState] = React.useState('idle');
      const [sync, setSyncState] = React.useState<string | null>(null);
      setT = setTState;
      setSync = setSyncState;
      return (
        <Stage width={50} height={50}>
          <Layer>
            <Rect width={20} height={20} name={sync ?? t} />
          </Layer>
        </Stage>
      );
    };
    const { stage } = render(<App />);

    React.startTransition(() => setT('low'));
    flushSync(() => setSync('high'));
    await vi.waitFor(() =>
      expect((stage()!.findOne('Rect') as Konva.Rect).name()).toBe('high')
    );
  });

  it('a DOM transition keeps canvas content visible when data is read above Stage', async () => {
    let release!: (fill: string) => void;
    const ready = new Promise<string>((resolve) => { release = resolve; });
    const stageRef = React.createRef<Konva.Stage>();
    const canvasLayout = vi.fn();
    const Canvas = ({ fill }: { fill: string }) => {
      React.useLayoutEffect(() => { canvasLayout(); }, []);
      return <Rect fill={fill} />;
    };
    const Drawing = ({ load }: { load: boolean }) => {
      const fill = load ? React.use(ready) : 'red';
      return <Stage ref={stageRef} width={100} height={100}><Layer><Canvas fill={fill} /></Layer></Stage>;
    };
    const App = () => {
      const [load, setLoad] = React.useState(false);
      const [pending, start] = React.useTransition();
      return <>
        <button onClick={() => start(() => setLoad(true))}>{pending ? 'Pending' : 'Load'}</button>
        <React.Suspense fallback={<p>Loading</p>}><Drawing load={load} /></React.Suspense>
      </>;
    };
    const view = render(<App />);
    const stage = stageRef.current!;
    const rect = stage.findOne('Rect') as Konva.Rect;
    await act(async () => { view.container.querySelector('button')!.click(); });
    await vi.waitFor(() => expect(view.container.querySelector('button')!.textContent).toBe('Pending'));
    expect(view.container.querySelector('p')).toBeNull();
    expect(stageRef.current).toBe(stage);
    expect(rect.isVisible()).toBe(true);
    expect(rect.fill()).toBe('red');
    expect(canvasLayout).toHaveBeenCalledTimes(1);
    await act(async () => { release('blue'); });
    await vi.waitFor(() => expect(rect.fill()).toBe('blue'));
    expect(view.container.querySelector('button')!.textContent).toBe('Load');
    expect(stage.findOne('Rect')).toBe(rect);
    expect(canvasLayout).toHaveBeenCalledTimes(1);
  });

  // §2.7 (deleted): claimed to anchor "scheduleMicrotask is synchronous", but
  // (a) host-config scheduleMicrotask is queueMicrotask (async, intentional —
  // see ReactKonvaHostConfig.ts:134-139 and §7's mobx-race regression test),
  // and (b) the assertion only proved react-dom's flushSync is synchronous,
  // which §2.5 already covers identically. The async-scheduleMicrotask
  // contract is anchored by §7. The "parent useLayoutEffect reads Konva
  // children" contract (the reason Stage's useLayoutEffect calls
  // flushSyncWork() inline) is anchored by §1.1, §1.2, and §16.1–§16.7.
});
