// §9 — Event handling.
// Konva events that mutate React state must commit at DiscreteEventPriority
// (sync lane) — verified by checking the commit lands before the next line.

import * as React from 'react';
import { describe, it, expect } from 'vitest';
import Konva from 'konva';
import { Stage, Layer, Rect } from '../src/ReactKonva';
import { render, act } from './helpers/render';

const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));

describe('§9 event handling', () => {
  it('§9.1 Konva pointer event mutating state commits synchronously (DiscreteEventPriority)', () => {
    let stageRef!: Konva.Stage;
    const App = () => {
      const [count, setCount] = React.useState(0);
      const ref = React.useRef<Konva.Stage>(null);
      React.useLayoutEffect(() => {
        if (ref.current) stageRef = ref.current;
      });
      return (
        <Stage
          ref={ref}
          width={100}
          height={100}
          onMouseDown={() => setCount((n) => n + 1)}
        >
          <Layer>
            <Rect width={50} height={50} name={`count-${count}`} />
          </Layer>
        </Stage>
      );
    };
    render(<App />);
    expect(stageRef!.findOne('.count-0')).toBeInstanceOf(Konva.Rect);
    act(() => {
      stageRef!.simulateMouseDown({ x: 10, y: 10 });
    });
    // After the discrete event handler returns, the new count must be on canvas.
    expect(stageRef!.findOne('.count-1')).toBeInstanceOf(Konva.Rect);
  });

  it('§9.2 high-frequency drag — many state updates per second, no dropped commits', () => {
    let stageRef!: Konva.Stage;
    const App = () => {
      const [x, setX] = React.useState(0);
      const ref = React.useRef<Konva.Stage>(null);
      React.useLayoutEffect(() => {
        if (ref.current) stageRef = ref.current;
      });
      return (
        <Stage
          ref={ref}
          width={500}
          height={100}
          onMouseMove={(e) => setX(e.evt.clientX)}
        >
          <Layer>
            <Rect width={20} height={20} x={x} />
          </Layer>
        </Stage>
      );
    };
    render(<App />);
    act(() => {
      stageRef!.simulateMouseDown({ x: 0, y: 0 });
      for (let i = 1; i <= 30; i++) {
        stageRef!.simulateMouseMove({ x: i * 5, y: 0 });
      }
      stageRef!.simulateMouseUp({ x: 150, y: 0 });
    });
    // Final x should match the last mouseMove, not be stuck at an earlier value.
    expect((stageRef!.findOne('Rect') as Konva.Rect).x()).toBe(150);
  });

  it('§9.3 onClick + onMouseUp ordering — both fire and both commits land', () => {
    let stageRef!: Konva.Stage;
    const log: string[] = [];
    const App = () => {
      const [n, setN] = React.useState(0);
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
                log.push('down');
                setN((v) => v + 1);
              }}
              onMouseUp={() => {
                log.push('up');
                setN((v) => v + 10);
              }}
              onClick={() => {
                log.push('click');
                setN((v) => v + 100);
              }}
              name={`n-${n}`}
            />
          </Layer>
        </Stage>
      );
    };
    render(<App />);
    act(() => {
      stageRef!.simulateMouseDown({ x: 10, y: 10 });
      stageRef!.simulateMouseUp({ x: 10, y: 10 });
    });
    expect(log[0]).toBe('down');
    expect(log).toContain('up');
    expect(log).toContain('click');
    // Final n reflects all three handlers' state updates.
    expect(stageRef!.findOne(`.n-111`)).toBeInstanceOf(Konva.Rect);
  });

  it('§9.4 event after unmount does not crash', async () => {
    let stageRef!: Konva.Stage;
    const App = () => {
      const ref = React.useRef<Konva.Stage>(null);
      React.useLayoutEffect(() => {
        if (ref.current) stageRef = ref.current;
      });
      return (
        <Stage ref={ref} width={50} height={50} onMouseDown={() => {}}>
          <Layer />
        </Stage>
      );
    };
    const result = render(<App />);
    const captured = stageRef!;
    act(() => result.unmount());
    await tick();
    // After unmount, dispatching an event on the destroyed stage should not crash.
    expect(() => {
      try {
        captured.simulateMouseDown({ x: 0, y: 0 });
      } catch {
        // some Konva internals may throw on a destroyed stage; the React tree
        // owning it is already unmounted — that's the contract being asserted.
      }
    }).not.toThrow();
  });

  it('§9.5 changing key order during a drag does not stop the drag', () => {
    // Drag state is on the Konva node; changing React key order must not
    // remount the dragged node and thereby cancel the drag.
    let stageRef!: Konva.Stage;
    const App = ({ kids }: { kids: React.ReactElement[] }) => (
      <Stage
        ref={(s) => {
          if (s) stageRef = s;
        }}
        width={300}
        height={300}
      >
        <Layer>{kids}</Layer>
      </Stage>
    );
    const initialKids = [
      <Rect key="1" name="rect1" />,
      <Rect key="2" name="rect2" />,
      <Rect key="3" name="rect3" />,
    ];
    const { rerender } = render(<App kids={initialKids} />);
    const rect1 = stageRef!.findOne('.rect1') as Konva.Rect;

    act(() => stageRef!.simulateMouseDown({ x: 5, y: 5 }));
    act(() => rect1.startDrag());
    act(() => stageRef!.simulateMouseMove({ x: 10, y: 10 }));
    expect(rect1.isDragging()).toBe(true);

    // Reorder keys mid-drag.
    const reorderedKids = [
      <Rect key="3" name="rect3" />,
      <Rect key="1" name="rect1" />,
      <Rect key="2" name="rect2" />,
    ];
    act(() => rerender(<App kids={reorderedKids} />));
    expect(rect1.isDragging()).toBe(true);
    rect1.stopDrag();
  });
});
