// §5 — Multiple roots & portals.

import * as React from 'react';
import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { describe, it, expect } from 'vitest';
import Konva from 'konva';
import { Stage, Layer, Rect, Group } from '../src/ReactKonva';
import { render, act } from './helpers/render';
import { Html } from './helpers/html-fixture';

const tick = (ms = 50) => new Promise((r) => setTimeout(r, ms));

describe('§5 multi-root & portals', () => {
  it('§5.1 two independent <Stage> instances — state changes update both without cross-contamination', () => {
    let setA!: (s: string) => void;
    let setB!: (s: string) => void;
    const aStageRef = React.createRef<Konva.Stage>();
    const bStageRef = React.createRef<Konva.Stage>();
    const App = () => {
      const [a, sa] = React.useState('red');
      const [b, sb] = React.useState('green');
      setA = sa;
      setB = sb;
      return (
        <>
          <Stage ref={aStageRef} width={50} height={50}>
            <Layer>
              <Rect width={10} height={10} fill={a} />
            </Layer>
          </Stage>
          <Stage ref={bStageRef} width={50} height={50}>
            <Layer>
              <Rect width={10} height={10} fill={b} />
            </Layer>
          </Stage>
        </>
      );
    };
    render(<App />);
    expect((aStageRef.current!.findOne('Rect') as Konva.Rect).fill()).toBe('red');
    expect((bStageRef.current!.findOne('Rect') as Konva.Rect).fill()).toBe('green');
    act(() => setA('orange'));
    expect((aStageRef.current!.findOne('Rect') as Konva.Rect).fill()).toBe('orange');
    expect((bStageRef.current!.findOne('Rect') as Konva.Rect).fill()).toBe('green');
    act(() => setB('blue'));
    expect((aStageRef.current!.findOne('Rect') as Konva.Rect).fill()).toBe('orange');
    expect((bStageRef.current!.findOne('Rect') as Konva.Rect).fill()).toBe('blue');
  });

  it('§5.2 <Stage> mounted via createPortal — useLayoutEffect ordering still correct', () => {
    const portalHost = document.createElement('div');
    portalHost.id = 'portal-host';
    document.body.appendChild(portalHost);
    let observed: Konva.Rect | null = null;
    const App = () => {
      const stageRef = React.useRef<Konva.Stage>(null);
      React.useLayoutEffect(() => {
        observed = stageRef.current?.findOne('Rect') as Konva.Rect | null;
      });
      return createPortal(
        <Stage ref={stageRef} width={50} height={50}>
          <Layer>
            <Rect width={10} height={10} fill="red" />
          </Layer>
        </Stage>,
        portalHost
      );
    };
    try {
      render(<App />);
      expect(observed).toBeInstanceOf(Konva.Rect);
    } finally {
      portalHost.parentNode?.removeChild(portalHost);
    }
  });

  it('§5.3 <Html> portal inside Stage — drains via queueMicrotask + flushSync', async () => {
    const spy = document.createElement('span');
    spy.textContent = 'before';
    const App = () => (
      <Stage width={50} height={50}>
        <Layer>
          <Html>
            <div data-html-content="yes">html-content</div>
          </Html>
        </Layer>
      </Stage>
    );
    const { container } = render(<App />);
    await act(() => tick());
    const stageContainer = container.querySelector('div')!;
    const found = stageContainer.querySelector('[data-html-content="yes"]');
    expect(found).not.toBeNull();
    expect(found!.textContent).toBe('html-content');
    spy.remove();
  });

  it('§5.4 nested <Html> — inner content reaches the secondary root', async () => {
    const App = () => (
      <Stage width={50} height={50}>
        <Layer>
          <Html>
            <div data-outer="yes">
              <span data-inner="yes">nested</span>
            </div>
          </Html>
        </Layer>
      </Stage>
    );
    const { container } = render(<App />);
    await act(() => tick());
    expect(container.querySelector('[data-outer="yes"]')).not.toBeNull();
    expect(container.querySelector('[data-inner="yes"]')?.textContent).toBe(
      'nested'
    );
  });

  it('§5.5 switching DOM roots — mount Stage in root A, unmount, mount in root B', () => {
    const a = document.createElement('div');
    const b = document.createElement('div');
    document.body.appendChild(a);
    document.body.appendChild(b);
    try {
      const rootA = createRoot(a);
      act(() => {
        rootA.render(
          <Stage width={50} height={50}>
            <Layer>
              <Rect width={10} height={10} fill="red" />
            </Layer>
          </Stage>
        );
      });
      const stageA = Konva.stages[Konva.stages.length - 1];
      expect(stageA).toBeInstanceOf(Konva.Stage);

      act(() => rootA.unmount());

      const rootB = createRoot(b);
      act(() => {
        rootB.render(
          <Stage width={60} height={60}>
            <Layer>
              <Rect width={10} height={10} fill="blue" />
            </Layer>
          </Stage>
        );
      });
      const stageB = Konva.stages[Konva.stages.length - 1];
      expect(stageB).toBeInstanceOf(Konva.Stage);
      expect(stageB).not.toBe(stageA);
      expect(stageB.width()).toBe(60);

      act(() => rootB.unmount());
    } finally {
      a.parentNode?.removeChild(a);
      b.parentNode?.removeChild(b);
    }
  });

  it('§5.7 keyed Group replacement preserves sibling identity, replaces only the keyed subtree', () => {
    // r3f tests `createPortal` with a Konva-like target getting replaced via
    // key. react-dom's `createPortal` validates the target is a DOM element,
    // so the literal r3f scenario doesn't translate. We test the equivalent
    // *react-konva-supported* scenario: a keyed Group is replaced by a key
    // change, sibling Groups in the same Layer are NOT remounted, and the
    // new Group's children are correctly re-attached to the new instance.
    let setKey!: (n: number) => void;
    const App = () => {
      const [k, set] = React.useState(0);
      setKey = set;
      return (
        <Stage width={100} height={100}>
          <Layer>
            <Group name="sibling">
              <Rect name="sibling-rect" width={10} height={10} />
            </Group>
            <Group key={k} name={`target-${k}`}>
              <Rect name="child" width={10} height={10} />
            </Group>
          </Layer>
        </Stage>
      );
    };
    const { stage } = render(<App />);
    const sibling0 = stage()!.findOne('.sibling') as Konva.Group;
    const target0 = stage()!.findOne('.target-0') as Konva.Group;
    const child0 = target0.findOne('.child') as Konva.Rect;
    const siblingRect0 = sibling0.findOne('.sibling-rect') as Konva.Rect;

    act(() => setKey(1));

    // Sibling not under the keyed boundary keeps identity.
    const sibling1 = stage()!.findOne('.sibling') as Konva.Group;
    expect(sibling1).toBe(sibling0);
    expect(sibling1.findOne('.sibling-rect')).toBe(siblingRect0);
    // Keyed target is replaced — same name pattern, different instance.
    const target1 = stage()!.findOne('.target-1') as Konva.Group;
    expect(target1).toBeInstanceOf(Konva.Group);
    expect(target1).not.toBe(target0);
    // The child is re-attached to the new target.
    const child1 = target1.findOne('.child') as Konva.Rect;
    expect(child1).toBeInstanceOf(Konva.Rect);
    expect(child1).not.toBe(child0);
    // Old target and its children must be detached from the stage.
    expect(target0.getStage()).toBeNull();
    expect(child0.getStage()).toBeNull();
    expect(stage()!.findOne('.target-0')).toBeUndefined();
    // Exactly one child rect under the new target — no duplicates.
    expect(target1.find('.child').length).toBe(1);
  });

  it('§5.6 <Html> content unmounts cleanly — no leaked secondary host divs', async () => {
    const App = ({ show }: { show: boolean }) => (
      <Stage width={50} height={50}>
        <Layer>
          {show && (
            <Html>
              <div data-tracked="yes">html</div>
            </Html>
          )}
        </Layer>
      </Stage>
    );
    const { container, rerender } = render(<App show={true} />);
    await act(() => tick());
    expect(container.querySelector('[data-tracked="yes"]')).not.toBeNull();

    act(() => rerender(<App show={false} />));
    // The Html fixture defers its unmount via setTimeout; wait for that.
    await act(() => tick(20));
    expect(container.querySelector('[data-tracked="yes"]')).toBeNull();
  });
});
