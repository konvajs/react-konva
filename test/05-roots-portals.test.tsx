// §5 — Multiple roots & portals.

import * as React from 'react';
import { createPortal } from 'react-dom';
import { describe, it, expect, vi } from 'vitest';
import Konva from 'konva';
import { Stage, Layer, Rect, Group } from '../src/ReactKonva';
import { render, act } from './helpers/render';
import { Html } from './helpers/html-fixture';

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
    const found = await vi.waitFor(() => {
      const stageContainer = container.querySelector('div')!;
      const node = stageContainer.querySelector('[data-html-content="yes"]');
      expect(node).not.toBeNull();
      return node!;
    });
    expect(found.textContent).toBe('html-content');
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
    await vi.waitFor(() => {
      expect(container.querySelector('[data-outer="yes"]')).not.toBeNull();
      expect(container.querySelector('[data-inner="yes"]')?.textContent).toBe(
        'nested'
      );
    });
  });

  it('§5.5 switching DOM roots — mount Stage in root A, unmount, mount in root B', async () => {
    // Each helper-render creates its own DOM container and react-dom root, so
    // calling it twice models the "swap to a new container" scenario without
    // ad-hoc createRoot wiring.
    const refA = React.createRef<Konva.Stage>();
    const resultA = render(
      <Stage ref={refA} width={50} height={50}>
        <Layer>
          <Rect width={10} height={10} fill="red" />
        </Layer>
      </Stage>
    );
    const stageA = refA.current!;
    expect(stageA).toBeInstanceOf(Konva.Stage);

    resultA.unmount();
    // Stage.destroy() removes itself from Konva.stages — that's the
    // observable "destroyed" signal for a Stage. (getStage() on a Stage
    // returns `this` regardless, so it can't be used here.)
    await vi.waitFor(() => expect(Konva.stages.includes(stageA)).toBe(false));

    const refB = React.createRef<Konva.Stage>();
    render(
      <Stage ref={refB} width={60} height={60}>
        <Layer>
          <Rect width={10} height={10} fill="blue" />
        </Layer>
      </Stage>
    );
    const stageB = refB.current!;
    expect(stageB).toBeInstanceOf(Konva.Stage);
    expect(stageB).not.toBe(stageA);
    expect(stageB.width()).toBe(60);
    expect(Konva.stages.includes(stageB)).toBe(true);
  });

  it('§5.6 keyed Group replacement preserves sibling identity, replaces only the keyed subtree', () => {
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

  it('§5.7 <Html> content unmounts cleanly — no leaked secondary host divs', async () => {
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
    await vi.waitFor(() =>
      expect(container.querySelector('[data-tracked="yes"]')).not.toBeNull()
    );

    rerender(<App show={false} />);
    // The Html fixture defers its unmount via setTimeout; vi.waitFor polls.
    await vi.waitFor(() =>
      expect(container.querySelector('[data-tracked="yes"]')).toBeNull()
    );
  });
});
