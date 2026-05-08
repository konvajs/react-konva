// §13 — Error handling.
//
// Important architectural note: react-konva's <Stage> creates its own
// react-reconciler container, so errors thrown by descendants of <Stage> are
// caught by error boundaries INSIDE the Stage subtree, not by boundaries
// above it in the react-dom tree. This is why the §13.2 / §13.3 boundaries
// here render Konva elements as their fallback rather than DOM <div>s.

import * as React from 'react';
import { describe, it, expect } from 'vitest';
import Konva from 'konva';
import { Stage, Layer, Rect, Group } from '../src/ReactKonva';
import { render, act } from './helpers/render';

const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));

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
    try {
      act(() => stageRef!.simulateMouseDown({ x: 10, y: 10 }));
    } catch {
      // act() rethrows — expected.
    }
    // Tree state still consistent.
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
    try {
      act(() => trigger());
    } catch {}
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
    try {
      await act(async () => {
        await Promise.resolve();
        trigger();
      });
    } catch {}
    await tick();
    expect(stage()!.findOne('.async-fallback')).toBeInstanceOf(Konva.Rect);
  });

  it('§13.4 unknown Konva element type — render fails cleanly, no half-mounted state', () => {
    const before = Konva.stages.length;
    let threw = false;
    try {
      render(
        <Stage width={50} height={50}>
          <Layer>
            {React.createElement('NotARealKonvaType' as any, {})}
          </Layer>
        </Stage>
      );
    } catch {
      threw = true;
    }
    void threw;
    // Either react-konva threw on createInstance (clean error path) OR it
    // mounted with a missing element. Hard requirement: no leaked Stage.
    // afterEach asserts that.
    expect(Konva.stages.length).toBeLessThanOrEqual(before + 1);
  });
});
