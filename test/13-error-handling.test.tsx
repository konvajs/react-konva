// §13 — Error handling.
//
// Boundaries inside Stage render Konva fallbacks. Uncaught canvas errors are
// reported in the console; DOM boundaries do not catch across renderer roots.

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Konva from 'konva';
import { Stage, Layer, Rect, Group } from '../src/ReactKonva';
import { render, act } from './helpers/render';

class KonvaBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? this.props.fallback : this.props.children;
  }
}

describe('§13 error handling', () => {
  // These tests intentionally trigger errors React reports via console.error.
  // Silence them for the duration of the describe so the suite-wide strict
  // console.error guard (helpers/render.tsx) doesn't fail them.
  let errSpy: ReturnType<typeof vi.spyOn> | undefined;
  beforeEach(() => {
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    errSpy?.mockRestore();
  });

  it.each(['mount', 'render', 'layout', 'action'])('reports uncaught canvas %s errors without replacing the surrounding DOM', async (kind) => {
    const failure = new Error('canvas failed');
    const Canvas = () => {
      const [broken, setBroken] = React.useState(kind === 'mount');
      const [, submit] = React.useActionState(async () => { throw failure; }, null);
      React.useLayoutEffect(() => {
        if (kind === 'layout' && broken) throw failure;
      }, [broken]);
      if (broken && kind !== 'layout') throw failure;
      return <Rect onClick={() => {
        if (kind === 'action') React.startTransition(() => submit());
        else setBroken(true);
      }} />;
    };
    const App = () => {
      const [mounted, setMounted] = React.useState(kind !== 'mount');
      return <>
        <button onClick={() => setMounted(true)}>Mount</button>
        <KonvaBoundary fallback={<p>DOM fallback</p>}>
          <span>Editor controls</span>
          {mounted && <Stage width={50} height={50}><Layer><Canvas /></Layer></Stage>}
        </KonvaBoundary>
      </>;
    };
    const view = render(<App />);
    // Exercise real application reporting. React.act rethrows uncaught errors
    // instead of calling a renderer's onUncaughtError callback.
    if (kind === 'mount') view.container.querySelector('button')!.click();
    else view.stage()!.findOne('Rect')!.fire('click');
    await vi.waitFor(() => expect(errSpy!.mock.calls.some(([error, info]) =>
      error === failure && info?.componentStack?.includes('Canvas'),
    )).toBe(true));
    expect(view.container.querySelector('p')).toBeNull();
    expect(view.container.querySelector('span')?.textContent).toBe('Editor controls');
    expect(view.stage()!.getChildren()).toHaveLength(0);
    expect(Konva.stages).toHaveLength(1);
  });

  it.each([
    ['layout', false], ['passive', false],
    ['insertion', false], ['insertion', true],
  ] as const)('reports %s cleanup errors and disposes Stage (hidden=%s)', async (kind, hidden) => {
    const failure = new Error(`${kind} cleanup failed`);
    const Content = () => {
      const useEffect = kind === 'layout' ? React.useLayoutEffect : kind === 'insertion' ? React.useInsertionEffect : React.useEffect;
      useEffect(() => () => { throw failure; }, []);
      return <Rect />;
    };
    const App = () => {
      const [mounted, setMounted] = React.useState(true);
      const [mode, setMode] = React.useState<'visible' | 'hidden'>('visible');
      return <>
        <button onClick={() => setMounted(false)}>Remove</button>
        <button onClick={() => setMode('hidden')}>Hide</button>
        <KonvaBoundary fallback={<p>DOM fallback</p>}>
          <span>Editor controls</span>
          {mounted && <React.Activity mode={mode}>
            <Stage width={50} height={50}><Layer><Content /></Layer></Stage>
          </React.Activity>}
        </KonvaBoundary>
      </>;
    };
    const view = render(<App />);
    if (hidden) await act(async () => { view.container.querySelectorAll('button')[1].click(); });
    view.container.querySelector('button')!.click();
    await vi.waitFor(() => expect(errSpy!.mock.calls.some(([error, info]) =>
      error === failure && info?.componentStack?.includes('Content'),
    )).toBe(true));
    expect(view.container.querySelector('p')).toBeNull();
    expect(view.container.querySelector('span')?.textContent).toBe('Editor controls');
    expect(Konva.stages).toHaveLength(0);
  });

  it('reports every cleanup failure when several children throw', async () => {
    const failures = [new Error('first cleanup failed'), new Error('second cleanup failed')];
    const Content = ({ index }: { index: number }) => {
      React.useLayoutEffect(() => () => { throw failures[index]; }, []);
      return <Rect />;
    };
    const App = () => {
      const [mounted, setMounted] = React.useState(true);
      return <>
        <button onClick={() => setMounted(false)}>Remove</button>
        <KonvaBoundary fallback={<p>DOM fallback</p>}>
          {mounted && <Stage width={50} height={50}><Layer><Content index={0} /><Content index={1} /></Layer></Stage>}
        </KonvaBoundary>
      </>;
    };
    const view = render(<App />);
    view.container.querySelector('button')!.click();
    await vi.waitFor(() => {
      for (const failure of failures) {
        expect(errSpy!.mock.calls.some(([error, info]) =>
          error === failure && info?.componentStack?.includes('Content'),
        )).toBe(true);
      }
    });
    expect(view.container.querySelector('p')).toBeNull();
    expect(Konva.stages).toHaveLength(0);
  });

  it('reports cleanup errors when deleting a Suspense-hidden Stage alongside a sibling', async () => {
    const failure = new Error('hidden cleanup failed');
    const never = new Promise<void>(() => {});
    const Gate = ({ suspended }: { suspended: boolean }) => {
      if (suspended) React.use(never);
      return null;
    };
    const Content = () => {
      React.useInsertionEffect(() => () => { throw failure; }, []);
      return <Rect />;
    };
    const App = () => {
      const [suspended, setSuspended] = React.useState(false);
      const [mounted, setMounted] = React.useState(true);
      return <>
        <button onClick={() => setSuspended(true)}>Suspend</button>
        <button onClick={() => setMounted(false)}>Remove</button>
        <KonvaBoundary fallback={<p>DOM fallback</p>}>
          {mounted && <>
            <React.Suspense fallback={<span>Loading</span>}>
              <Stage width={50} height={50}><Layer><Content /></Layer></Stage>
              <Gate suspended={suspended} />
            </React.Suspense>
            <Stage width={50} height={50}><Layer><Rect /></Layer></Stage>
          </>}
        </KonvaBoundary>
      </>;
    };
    const view = render(<App />);
    await act(async () => { view.container.querySelectorAll('button')[0].click(); });
    expect(view.container.querySelector('span')?.textContent).toBe('Loading');
    view.container.querySelectorAll('button')[1].click();
    await vi.waitFor(() => expect(errSpy!.mock.calls.some(([error, info]) =>
      error === failure && info?.componentStack?.includes('Content'),
    )).toBe(true));
    expect(view.container.querySelector('p')).toBeNull();
    expect(Konva.stages).toHaveLength(0);
  });

  it('§13.1 user onClick that throws — does not crash; Konva tree remains', () => {
    let stageRef!: Konva.Stage;
    const App = () => {
      const ref = React.useRef<Konva.Stage>(null);
      React.useLayoutEffect(() => {
        if (ref.current) stageRef = ref.current;
      });
      return (
        <Stage ref={ref} width={50} height={50}>
          <Layer>
            <Rect
              width={50}
              height={50}
              onMouseDown={() => {
                throw new Error('user handler throws');
              }}
              name="r"
            />
          </Layer>
        </Stage>
      );
    };
    render(<App />);
    expect(stageRef!.findOne('.r')).toBeInstanceOf(Konva.Rect);
    // Real DOM dispatchEvent swallows listener throws (the browser reports
    // them via window.onerror instead of propagating up). So act() does NOT
    // re-throw here — the contract is just "no crash, tree stays intact".
    // Vitest's browser mode promotes window.onerror events to "Unhandled
    // Error" reports, so swallow this specific one for the duration of the
    // dispatch.
    const seen: ErrorEvent[] = [];
    const swallow = (e: ErrorEvent) => {
      if (e.message?.includes('user handler throws')) {
        e.preventDefault();
        seen.push(e);
      }
    };
    window.addEventListener('error', swallow);
    try {
      act(() => stageRef!.simulateMouseDown({ x: 10, y: 10 }));
    } finally {
      window.removeEventListener('error', swallow);
    }
    expect(seen.length).toBe(1);
    expect(stageRef!.findOne('.r')).toBeInstanceOf(Konva.Rect);
  });

  it('§13.2 render-time throw inside Stage — boundary INSIDE Stage catches and renders fallback', () => {
    let trigger!: () => void;
    const Bomb = () => {
      const [boom, setBoom] = React.useState(false);
      trigger = () => setBoom(true);
      if (boom) throw new Error('render-time bomb');
      return <Rect name="bomb" width={10} height={10} />;
    };
    const { stage } = render(
      <Stage width={50} height={50}>
        <Layer>
          <KonvaBoundary fallback={<Rect name="fallback" width={10} height={10} />}>
            <Bomb />
          </KonvaBoundary>
        </Layer>
      </Stage>
    );
    expect(stage()!.findOne('.bomb')).toBeInstanceOf(Konva.Rect);
    act(() => trigger());
    // Boundary catches; tree swaps cleanly.
    expect(stage()!.findOne('.fallback')).toBeInstanceOf(Konva.Rect);
    expect(stage()!.findOne('.bomb')).toBeUndefined();
  });

  it('§13.3 async-triggered error inside Konva subtree — boundary recovers', async () => {
    let trigger!: () => void;
    const AsyncBomb = () => {
      const [boom, setBoom] = React.useState(false);
      trigger = () => setBoom(true);
      if (boom) throw new Error('async bomb');
      return <Rect name="async-bomb" width={10} height={10} />;
    };
    const { stage } = render(
      <Stage width={50} height={50}>
        <Layer>
          <KonvaBoundary fallback={<Rect name="async-fallback" width={10} height={10} />}>
            <Group>
              <AsyncBomb />
            </Group>
          </KonvaBoundary>
        </Layer>
      </Stage>
    );
    await act(async () => {
      await Promise.resolve();
      trigger();
    });
    await vi.waitFor(() =>
      expect(stage()!.findOne('.async-fallback')).toBeInstanceOf(Konva.Rect)
    );
  });

  it.each(['use', 'useActionState'])('%s rejection reaches an error boundary inside Stage', async (hook) => {
    let reject!: (error: Error) => void;
    const promise = new Promise<string>((_, rejectPromise) => { reject = rejectPromise; });
    const Canvas = () => {
      const [read, setRead] = React.useState(false);
      const [name, submit] = React.useActionState(() => promise, 'ready');
      if (hook === 'use' && read) React.use(promise);
      return <Rect name={name} onClick={() => {
        if (hook === 'use') setRead(true);
        else React.startTransition(() => submit());
      }} />;
    };
    const { stage } = render(
      <Stage width={50} height={50}>
        <Layer>
          <KonvaBoundary fallback={<Rect name="failed" />}>
            <React.Suspense fallback={<Rect name="loading" />}><Canvas /></React.Suspense>
          </KonvaBoundary>
        </Layer>
      </Stage>,
    );
    await act(() => stage()!.findOne('.ready')!.fire('click'));
    await act(() => reject(new Error('request failed')));
    await vi.waitFor(() => expect(stage()!.findOne('.failed')).toBeInstanceOf(Konva.Rect));
    expect(stage()!.findOne('.ready')).toBeUndefined();
    expect(stage()!.findOne('.loading')).toBeUndefined();
    expect(errSpy!.mock.calls.some(([error]) => String(error).includes('request failed'))).toBe(true);
  });

  it('§13.4 unknown Konva element type — logs warning, falls back to Group, tree stays consistent', () => {
    // Source contract (src/ReactKonvaHostConfig.ts:43-50):
    //   - console.error a "no such node" warning
    //   - substitute Konva.Group as the fallback
    //   - mount succeeds; afterEach's leak guard verifies clean unmount
    // The describe-level errSpy (above) catches the warning so we can
    // inspect its calls.
    const before = Konva.stages.length;
    const { stage } = render(
      <Stage width={50} height={50}>
        <Layer>
          {React.createElement('NotARealKonvaType' as any, {
            name: 'fallback-target',
          })}
        </Layer>
      </Stage>
    );
    expect(Konva.stages.length).toBe(before + 1);
    const fallbackNode = stage()!.findOne('.fallback-target');
    expect(fallbackNode).toBeInstanceOf(Konva.Group);
    const warnedAboutType = errSpy!.mock.calls.some(
      (args) => typeof args[0] === 'string' && args[0].includes('NotARealKonvaType')
    );
    expect(warnedAboutType).toBe(true);
  });

  it.each([false, true])('§13.5 ViewTransition inside Stage reports its support boundary (ref=%s)', async (withRef) => {
    let enable!: () => void;
    const ref = React.createRef<React.ViewTransitionInstance>();
    const Canvas = () => {
      const [enabled, setEnabled] = React.useState(false);
      enable = () => setEnabled(true);
      const child = <Rect name="child" width={10} height={10} fill="red" />;
      return enabled ? (
        <React.ViewTransition ref={withRef ? ref : undefined}>
          {withRef ? null : child}
        </React.ViewTransition>
      ) : child;
    };
    const { stage } = render(
      <Stage width={50} height={50}>
        <Layer>
          <KonvaBoundary fallback={<Rect name="fallback" width={10} height={10} />}>
            <Canvas />
          </KonvaBoundary>
        </Layer>
      </Stage>
    );

    expect(stage()!.findOne('.child')).toBeInstanceOf(Konva.Rect);
    await act(() => React.startTransition(enable));

    await vi.waitFor(() => {
      expect(stage()!.findOne('.fallback')).toBeInstanceOf(Konva.Rect);
      expect(stage()!.findOne('.child')).toBeUndefined();
    });
    expect(errSpy!.mock.calls.flat().some((value) =>
      value instanceof Error &&
      value.message.includes('ViewTransition is not supported inside a Stage.')
    )).toBe(true);
  });
});
