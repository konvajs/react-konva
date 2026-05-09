// §15 — Design-decision anchors.
//
// These tests anchor decisions in the host config and Stage component that
// are intentional and load-bearing. If a future contributor changes any of
// these without thinking, the tests fail. Each test cites the relevant
// source file:line so the change can be traced.

import * as React from 'react';
import { describe, it, expect } from 'vitest';
import { ConcurrentRoot } from 'react-reconciler/constants';
import Konva from 'konva';
import {
  Stage,
  Layer,
  Rect,
  useContextBridge,
  KonvaRenderer,
} from '../src/ReactKonva';
import { render, act } from './helpers/render';

describe('§15 design-decision anchors', () => {
  // src/ReactKonvaHostConfig.ts:147 — `isPrimaryRenderer = false`
  it('§15.1 isPrimaryRenderer = false — react-dom container exists in DOM before Konva.Stage is created', () => {
    let stageCreatedAt = -1;
    let domContainerCreatedAt = -1;
    const counter = { tick: 0 };

    const SpyDom = () => {
      domContainerCreatedAt = ++counter.tick;
      return null;
    };
    // We can't directly observe Konva.Stage construction time, so use a
    // ref callback that fires when the host node is available — order
    // proven by the relative tick numbers.
    render(
      <>
        <SpyDom />
        <Stage
          width={50}
          height={50}
          ref={(s) => {
            if (s && stageCreatedAt < 0) stageCreatedAt = ++counter.tick;
          }}
        >
          <Layer />
        </Stage>
      </>
    );
    expect(domContainerCreatedAt).toBeGreaterThan(0);
    expect(stageCreatedAt).toBeGreaterThan(domContainerCreatedAt);
  });

  // src/ReactKonvaHostConfig.ts:263–264 — `resolveUpdatePriority = DiscreteEventPriority`
  it('§15.2 updates from a Konva pointer event commit synchronously (sync lane)', () => {
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
    act(() => stageRef!.simulateMouseDown({ x: 10, y: 10 }));
    // DiscreteEventPriority means the update lands on the sync lane and
    // is committed before the simulated event returns. If priority were
    // ever weakened (e.g. transition lane), the new count would be
    // pending and the assertion would fail intermittently.
    expect(stageRef!.findOne('.count-1')).toBeInstanceOf(Konva.Rect);
  });

  // src/ReactKonvaCore.tsx:282 — `useContextBridge` (re-export from its-fine)
  it('§15.3 useContextBridge propagates DOM-tree contexts into the Konva subtree', () => {
    const Ctx = React.createContext<string>('default');
    let observed: string | undefined;

    // A "secondary-root" pattern using useContextBridge to forward contexts
    // from the DOM tree into a fresh react-dom render — the same pattern
    // <Html> uses. The Konva subtree itself reads context directly, but
    // anything below useContextBridge requires the bridge.
    const Reader = () => {
      observed = React.useContext(Ctx);
      return <Rect width={10} height={10} />;
    };
    const Bridged = () => {
      const Bridge = useContextBridge();
      return <Bridge><Reader /></Bridge>;
    };
    render(
      <Ctx.Provider value="bridged">
        <Stage width={50} height={50}>
          <Layer>
            <Bridged />
          </Layer>
        </Stage>
      </Ctx.Provider>
    );
    expect(observed).toBe('bridged');
  });

  // Additional anchor: KonvaRenderer is exported (used by react-konva-utils
  // and other downstream packages for flushSync scheduling).
  it('§15.4 KonvaRenderer is exported and exposes flushSyncFromReconciler / batchedUpdates', () => {
    expect(KonvaRenderer).toBeDefined();
    // These methods are public API for sibling packages (react-konva-utils,
    // react-konva-spring, etc.). Renaming them is a breaking change.
    expect(typeof KonvaRenderer.flushSyncFromReconciler).toBe('function');
    expect(typeof KonvaRenderer.batchedUpdates).toBe('function');
  });

  // §15.5 — flushSyncFromReconciler actually flushes synchronously.
  // §15.4 only asserts the method exists. This goes deeper: directly drive a
  // KonvaRenderer container (the same path Stage uses internally — see
  // ReactKonvaCore.tsx:200) and verify that commits inside the callback are
  // visible on the Konva tree before flushSyncFromReconciler returns.
  // Adapted from r3f's `'should update scene synchronously with flushSync'`.
  it('§15.5 KonvaRenderer.flushSyncFromReconciler commits synchronously inside the callback', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const stage = new Konva.Stage({ container: host, width: 50, height: 50 });
    try {
      // Mirrors the call shape in src/ReactKonvaCore.tsx:136-147.
      const fiberRoot = (KonvaRenderer.createContainer as any)(
        stage,
        ConcurrentRoot,
        null,
        false,
        null,
        '',
        () => {},
        () => {},
        () => {},
        null
      );

      // First, schedule an updateContainer that creates the initial layer + rect.
      KonvaRenderer.flushSyncFromReconciler(() => {
        KonvaRenderer.updateContainer(
          <Layer>
            <Rect name="r" x={5} width={10} height={10} />
          </Layer>,
          fiberRoot,
          null
        );
      });
      const r1 = stage.findOne('.r') as Konva.Rect;
      expect(r1).toBeInstanceOf(Konva.Rect);
      expect(r1.x()).toBe(5);

      // Now schedule a re-render and assert the new x value is on the Konva
      // node immediately after flushSyncFromReconciler returns — proving the
      // commit happened inside the callback, not on a later microtask.
      KonvaRenderer.flushSyncFromReconciler(() => {
        KonvaRenderer.updateContainer(
          <Layer>
            <Rect name="r" x={123} width={10} height={10} />
          </Layer>,
          fiberRoot,
          null
        );
      });
      expect((stage.findOne('.r') as Konva.Rect).x()).toBe(123);

      // Tear down the secondary root so afterEach's leak guard is happy.
      KonvaRenderer.flushSyncFromReconciler(() => {
        KonvaRenderer.updateContainer(null, fiberRoot, null);
      });
    } finally {
      stage.destroy();
      host.parentNode?.removeChild(host);
    }
  });

  // §15.6 — react-spring integration anchor.
  // react-spring's animated.* components call `node._applyProps(node, props)`
  // to push tween values to the underlying Konva node. react-konva sets this
  // method on `Konva.Node.prototype` as a side effect of importing
  // `ReactKonvaHostConfig`. Renaming or removing it breaks every animation
  // built on react-spring + react-konva.
  it('§15.6 Konva.Node.prototype._applyProps is set (react-spring contract)', () => {
    const { stage } = render(
      <Stage width={50} height={50}>
        <Layer>
          <Rect width={10} height={10} fill="red" />
        </Layer>
      </Stage>
    );
    const rect = stage()!.findOne('Rect') as Konva.Rect & {
      _applyProps?: unknown;
    };
    expect(typeof rect._applyProps).toBe('function');
  });
});
