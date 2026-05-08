// §2 — React 19 scheduler / lanes.
// What lane does work land on, and what guarantees hold per lane?

import * as React from 'react';
import { describe, it, expect } from 'vitest';
import { flushSync } from 'react-dom';
import Konva from 'konva';
import { Stage, Layer, Rect } from '../src/ReactKonva';
import { render, act } from './helpers/render';

const tick = (ms = 50) => new Promise((r) => setTimeout(r, ms));

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

    await act(async () => {
      React.startTransition(() => setFill('blue'));
      await tick();
    });
    expect((stage()!.findOne('Rect') as Konva.Rect).fill()).toBe('blue');
  });

  it('§2.1b sync update can interrupt a transition without leaving partial state', async () => {
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

    await act(async () => {
      React.startTransition(() => setFillTransition('blue'));
      // Sync (discrete) update interrupts before the transition commits.
      flushSync(() => setFillSync('green'));
      await tick();
    });
    // Final state must be the high-priority color, not partial.
    expect((stage()!.findOne('Rect') as Konva.Rect).fill()).toBe('green');
  });

  it('§2.2 useTransition `isPending` flips around a Konva-only update', async () => {
    const seen: boolean[] = [];
    let setN!: (n: number) => void;
    const App = () => {
      const [n, set] = React.useState(0);
      const [isPending, startT] = React.useTransition();
      setN = (next) => startT(() => set(next));
      seen.push(isPending);
      return (
        <Stage width={50} height={50}>
          <Layer>
            <Rect width={20} height={20} x={n} />
          </Layer>
        </Stage>
      );
    };
    render(<App />);
    expect(seen.includes(true)).toBe(false);
    await act(async () => {
      setN(10);
      await tick();
    });
    expect(seen.includes(true)).toBe(true);
    expect(seen[seen.length - 1]).toBe(false);
  });

  it('§2.3 useDeferredValue on a Konva prop lands eventually', async () => {
    let setX!: (n: number) => void;
    const App = () => {
      const [x, set] = React.useState(0);
      setX = set;
      const deferred = React.useDeferredValue(x);
      return (
        <Stage width={200} height={50}>
          <Layer>
            <Rect width={20} height={20} x={deferred} />
          </Layer>
        </Stage>
      );
    };
    const { stage } = render(<App />);
    await act(async () => {
      setX(123);
      await tick();
    });
    expect((stage()!.findOne('Rect') as Konva.Rect).x()).toBe(123);
  });

  it('§2.4 flushSync from react-dom commits Konva work inside the call', () => {
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

  it('§2.5 high-priority sync update wins over scheduled transition', async () => {
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

    await act(async () => {
      React.startTransition(() => setT('low'));
      flushSync(() => setSync('high'));
      await tick();
    });
    expect((stage()!.findOne('Rect') as Konva.Rect).name()).toBe('high');
  });

  it('§2.6 scheduleMicrotask synchrony — flushSync makes Konva visible before next line', () => {
    // Anchors host-config.scheduleMicrotask = fn => fn() (synchronous).
    // If scheduleMicrotask were ever changed to defer (queueMicrotask), this
    // assertion would start failing because the new prop wouldn't be on the
    // Konva node yet by the time the line after flushSync runs.
    let setFill!: (s: string) => void;
    let stageRef!: Konva.Stage;
    const App = () => {
      const [fill, set] = React.useState('red');
      setFill = set;
      const ref = React.useRef<Konva.Stage>(null);
      React.useLayoutEffect(() => {
        if (ref.current) stageRef = ref.current;
      });
      return (
        <Stage ref={ref} width={50} height={50}>
          <Layer>
            <Rect width={20} height={20} fill={fill} />
          </Layer>
        </Stage>
      );
    };
    render(<App />);
    flushSync(() => setFill('lime'));
    expect((stageRef!.findOne('Rect') as Konva.Rect).fill()).toBe('lime');
  });
});
