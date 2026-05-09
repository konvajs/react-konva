// §13 — Error handling.
//
// Important architectural note: react-konva's <Stage> creates its own
// react-reconciler container, so errors thrown by descendants of <Stage> are
// caught by error boundaries INSIDE the Stage subtree, not by boundaries
// above it in the react-dom tree. This is why the §13.2 / §13.3 boundaries
// here render Konva elements as their fallback rather than DOM <div>s.

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
});
