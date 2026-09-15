// §28 — State and lifecycle across React and renderer boundaries.

import * as React from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';
import Konva from 'konva';
import { Stage, Layer, Rect, Group, KonvaRenderer } from '../src/ReactKonva';
import { render, act } from './helpers/render';

describe('§28 React boundaries', () => {
  it.each(['StrictMode', 'Activity'])('reapplies Stage props when %s reconnects effects', (boundary) => {
    const drawing = <Stage width={50} height={50} x={1} ref={(stage) => {
      if (stage) return () => { stage.x(99); };
    }}><Layer /></Stage>;
    const view = render(boundary === 'StrictMode'
      ? <React.StrictMode>{drawing}</React.StrictMode>
      : <React.Activity mode="visible">{drawing}</React.Activity>);
    const stage = view.stage()!;
    if (boundary === 'Activity') {
      view.rerender(<React.Activity mode="hidden">{drawing}</React.Activity>);
      expect(stage.x()).toBe(99);
      view.rerender(<React.Activity mode="visible">{drawing}</React.Activity>);
    }
    expect(view.stage()).toBe(stage);
    expect(stage.x()).toBe(1);
  });

  it.each([false, true])('disposes an initially hidden Stage before its canvas mounts (StrictMode=%s)', async (strict) => {
    const ref = React.createRef<Konva.Stage>();
    const ui = (
      <React.Activity mode="hidden">
        <Stage ref={ref} id="initially-hidden" width={100} height={100}><Layer><Rect /></Layer></Stage>
      </React.Activity>
    );
    const view = render(strict ? <React.StrictMode>{ui}</React.StrictMode> : ui);
    await vi.waitFor(() => expect(view.container.querySelector('#initially-hidden')).not.toBeNull());
    expect(ref.current).toBeNull();
    expect(Konva.stages).toHaveLength(0);
    view.unmount();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(Konva.stages).toHaveLength(0);
  });

  it('hydrates the server container, then mounts canvas children with distinct IDs', async () => {
    const stageRef = React.createRef<Konva.Stage>();
    const Canvas = ({ fill }: { fill: string }) => <Rect id={React.useId()} fill={fill} />;
    const App = ({ fill }: { fill: string }) => (
      <>
        <output id={React.useId()} />
        <Stage ref={stageRef} title="drawing" width={100} height={100}>
          <Layer><Canvas fill={fill} /></Layer>
        </Stage>
      </>
    );
    const container = document.createElement('div');
    container.innerHTML = renderToString(<App fill="red" />, { identifierPrefix: 'page-' });
    const serverContainer = container.querySelector('[title="drawing"]');
    const serverId = container.querySelector('output')!.id;
    expect(container.querySelector('canvas')).toBeNull();
    expect(stageRef.current).toBeNull();
    document.body.appendChild(container);
    const recoverableErrors = vi.fn();
    let root: ReturnType<typeof hydrateRoot> | undefined;
    try {
      await act(() => {
        root = hydrateRoot(container, <App fill="red" />, {
          identifierPrefix: 'page-', onRecoverableError: recoverableErrors,
        });
      });
      await vi.waitFor(() => expect(stageRef.current).toBeInstanceOf(Konva.Stage));
      const rect = stageRef.current!.findOne('Rect') as Konva.Rect;
      expect(container.querySelector('[title="drawing"]')).toBe(serverContainer);
      expect(container.querySelector('output')!.id).toBe(serverId);
      expect(rect.id()).not.toBe(serverId);
      expect(rect.fill()).toBe('red');
      await act(() => root!.render(<App fill="blue" />));
      expect(stageRef.current!.findOne('Rect')).toBe(rect);
      expect(rect.fill()).toBe('blue');
      expect(recoverableErrors).not.toHaveBeenCalled();
    } finally {
      await act(() => root?.unmount());
      container.remove();
    }
    expect(stageRef.current).toBeNull();
  });

  it('Konva portals retain context, follow Activity visibility, and clean up replaced targets', () => {
    const Color = React.createContext('black');
    const first = React.createRef<Konva.Group>();
    const second = React.createRef<Konva.Group>();
    const Shape = () => <Rect name="portal-child" fill={React.use(Color)} />;
    const App = ({ target = null, color = 'red', mode = 'visible' }: {
      target?: Konva.Group | null; color?: string; mode?: 'visible' | 'hidden';
    }) => (
      <Color value={color}>
        <Stage width={100} height={100}>
          <Layer>
            <Group ref={first} />
            <Group ref={second} />
            <React.Activity mode={mode}>
              {target && KonvaRenderer.createPortal(<Shape />, target, null)}
            </React.Activity>
          </Layer>
        </Stage>
      </Color>
    );
    const view = render(<App />);
    view.rerender(<App target={first.current} />);
    const rect = first.current!.findOne('.portal-child') as Konva.Rect;
    expect(rect.fill()).toBe('red');
    view.rerender(<App target={first.current} color="blue" />);
    expect(first.current!.findOne('.portal-child')).toBe(rect);
    expect(rect.fill()).toBe('blue');
    view.rerender(<App target={first.current} mode="hidden" />);
    expect(rect.isVisible()).toBe(false);
    view.rerender(<App target={first.current} />);
    expect(rect.isVisible()).toBe(true);
    view.rerender(<App target={second.current} />);
    expect(first.current!.getChildren()).toHaveLength(0);
    expect(rect.getStage()).toBeNull();
    const replacement = second.current!.findOne('.portal-child')!;
    expect(replacement).not.toBe(rect);
    view.unmount();
    expect(replacement.getStage()).toBeNull();
  });

  it('nested Activities inside Stage retain state and reconnect effects only when visible', async () => {
    const layout = vi.fn();
    const passive = vi.fn();
    const layoutCleanup = vi.fn();
    const passiveCleanup = vi.fn();
    const Counter = () => {
      const [count, setCount] = React.useState(0);
      React.useLayoutEffect(() => { layout(); return layoutCleanup; }, []);
      React.useEffect(() => { passive(); return passiveCleanup; }, []);
      return <Rect name="counter" x={count} onClick={() => setCount((n) => n + 1)} />;
    };
    const App = ({ outer = 'visible', inner = 'visible' }: {
      outer?: 'visible' | 'hidden'; inner?: 'visible' | 'hidden';
    }) => (
      <Stage width={100} height={100}>
        <Layer>
          <React.Activity mode={outer}>
            <Group>
              <Rect name="invisible" visible={false} />
              <React.Activity mode={inner}><Counter /></React.Activity>
            </Group>
          </React.Activity>
        </Layer>
      </Stage>
    );
    const view = render(<App />);
    const rect = view.stage()!.findOne('.counter')!;
    await act(() => rect.fire('click'));
    expect(rect.x()).toBe(1);
    view.rerender(<App inner="hidden" />);
    expect(rect.isVisible()).toBe(false);
    await vi.waitFor(() => expect(passiveCleanup).toHaveBeenCalledTimes(1));
    expect(layoutCleanup).toHaveBeenCalledTimes(1);
    view.rerender(<App outer="hidden" inner="hidden" />);
    view.rerender(<App inner="hidden" />);
    expect(rect.isVisible()).toBe(false);
    expect(layout).toHaveBeenCalledTimes(1);
    expect(passive).toHaveBeenCalledTimes(1);
    view.rerender(<App />);
    await vi.waitFor(() => expect(passive).toHaveBeenCalledTimes(2));
    expect(layout).toHaveBeenCalledTimes(2);
    expect(view.stage()!.findOne('.counter')).toBe(rect);
    expect(rect.x()).toBe(1);
    expect(rect.isVisible()).toBe(true);
    expect(view.stage()!.findOne('.invisible')!.visible()).toBe(false);
    view.unmount();
    expect(layoutCleanup).toHaveBeenCalledTimes(2);
    expect(passiveCleanup).toHaveBeenCalledTimes(2);
  });

  it.each([false, true])('Activity around Stage preserves canvas state (StrictMode=%s)', async (strict) => {
    const stageRef = React.createRef<Konva.Stage>();
    const Counter = () => {
      const [count, setCount] = React.useState(0);
      return <Rect x={count} onClick={() => setCount((n) => n + 1)} />;
    };
    const App = ({ mode }: { mode: 'visible' | 'hidden' }) => {
      const ui = (
        <React.Activity mode={mode}>
          <Stage ref={stageRef} width={100} height={100}>
            <Layer><Counter /></Layer>
          </Stage>
        </React.Activity>
      );
      return strict ? <React.StrictMode>{ui}</React.StrictMode> : ui;
    };
    const view = render(<App mode="visible" />);
    const originalStage = stageRef.current;
    const rect = stageRef.current!.findOne('Rect')!;
    await act(() => rect.fire('click'));
    expect(rect.x()).toBe(1);
    view.rerender(<App mode="hidden" />);
    await new Promise((resolve) => setTimeout(resolve, 10));
    view.rerender(<App mode="visible" />);
    expect(stageRef.current!.findOne('Rect')!.x()).toBe(1);
    expect(stageRef.current!.findOne('Rect')).toBe(rect);
    expect(stageRef.current).toBe(originalStage);
  });

  it.each([false, true])('Activity around Stage disconnects effects and refs, then disposes hidden content (StrictMode=%s)', async (strict) => {
    const stageRef = React.createRef<Konva.Stage>();
    const rectRef = React.createRef<Konva.Rect>();
    const events = new EventTarget();
    const received: string[] = [];
    let layoutActive = false;
    const Canvas = ({ color }: { color: string }) => {
      React.useLayoutEffect(() => {
        layoutActive = true;
        return () => { layoutActive = false; };
      }, []);
      React.useEffect(() => {
        const receive = () => received.push(color);
        events.addEventListener('message', receive);
        return () => events.removeEventListener('message', receive);
      }, [color]);
      return <Rect ref={rectRef} fill={color} />;
    };
    const App = ({ mode, color = 'red' }: { mode: 'visible' | 'hidden'; color?: string }) => {
      const ui = (
        <React.Activity mode={mode}>
          <Stage ref={stageRef} width={100} height={100}>
            <Layer><Canvas color={color} /></Layer>
          </Stage>
        </React.Activity>
      );
      return strict ? <React.StrictMode>{ui}</React.StrictMode> : ui;
    };
    const view = render(<App mode="visible" />);
    const stage = stageRef.current!;
    const rect = rectRef.current!;
    events.dispatchEvent(new Event('message'));
    expect(layoutActive).toBe(true);
    view.rerender(<App mode="hidden" />);
    await act(async () => {});
    expect(stageRef.current).toBeNull();
    expect(rectRef.current).toBeNull();
    expect(layoutActive).toBe(false);
    events.dispatchEvent(new Event('message'));
    expect(received).toEqual(['red']);
    view.rerender(<App mode="hidden" color="blue" />);
    view.rerender(<App mode="visible" color="blue" />);
    expect(stageRef.current).toBe(stage);
    expect(rectRef.current).toBe(rect);
    expect(rect.fill()).toBe('blue');
    expect(layoutActive).toBe(true);
    events.dispatchEvent(new Event('message'));
    expect(received).toEqual(['red', 'blue']);
    view.rerender(<App mode="hidden" color="blue" />);
    view.unmount();
    await vi.waitFor(() => expect(Konva.stages).not.toContain(stage));
    expect(rect.getStage()).toBeNull();
    expect(layoutActive).toBe(false);
    events.dispatchEvent(new Event('message'));
    expect(received).toEqual(['red', 'blue']);
  });

  it('removes Stage attributes and handlers changed while Activity is hidden', () => {
    const clicked = vi.fn();
    const App = ({ hidden = false, configured = true }) => (
      <React.Activity mode={hidden ? 'hidden' : 'visible'}>
        <Stage width={100} height={100}
          {...(configured ? { name: 'configured', opacity: 0.5, onClick: clicked } : {})}
        >
          <Layer><Rect /></Layer>
        </Stage>
      </React.Activity>
    );
    const view = render(<App />);
    const stage = view.stage()!;
    stage.fire('click');
    view.rerender(<App hidden />);
    view.rerender(<App hidden configured={false} />);
    view.rerender(<App configured={false} />);
    expect(view.stage()).toBe(stage);
    expect(stage.name()).toBe('');
    expect(stage.opacity()).toBe(1);
    stage.fire('click');
    expect(clicked).toHaveBeenCalledTimes(1);
  });

  it.each([false, true])('Suspense around Stage preserves state and passive effects while disconnecting layout effects (StrictMode=%s)', async (strict) => {
    let release!: () => void;
    const ready = new Promise<void>((resolve) => { release = resolve; });
    const stageRef = React.createRef<Konva.Stage>();
    const rectRef = React.createRef<Konva.Rect>();
    const active = { domLayout: false, domPassive: false, canvasLayout: false, canvasPassive: false };
    const Content = ({ canvas = false }) => {
      const [count, setCount] = React.useState(0);
      React.useLayoutEffect(() => {
        active[canvas ? 'canvasLayout' : 'domLayout'] = true;
        return () => { active[canvas ? 'canvasLayout' : 'domLayout'] = false; };
      }, []);
      React.useEffect(() => {
        active[canvas ? 'canvasPassive' : 'domPassive'] = true;
        return () => { active[canvas ? 'canvasPassive' : 'domPassive'] = false; };
      }, []);
      return canvas ? <Rect ref={rectRef} x={count} onClick={() => setCount((n) => n + 1)} /> : <span />;
    };
    const Gate = ({ suspend }: { suspend: boolean }) => {
      if (suspend) React.use(ready);
      return null;
    };
    const App = ({ suspend = false }) => {
      const ui = (
        <React.Suspense fallback={<p>Loading</p>}>
          <Content />
          <Stage ref={stageRef} width={100} height={100}><Layer><Content canvas /></Layer></Stage>
          <Gate suspend={suspend} />
        </React.Suspense>
      );
      return strict ? <React.StrictMode>{ui}</React.StrictMode> : ui;
    };
    const view = render(<App />);
    const stage = stageRef.current!;
    const rect = rectRef.current!;
    await act(() => rect.fire('click'));
    expect(rect.x()).toBe(1);
    await act(async () => { view.rerender(<App suspend />); });
    await vi.waitFor(() => expect(view.container.querySelector('p')?.textContent).toBe('Loading'));
    expect(active).toEqual({ domLayout: false, domPassive: true, canvasLayout: false, canvasPassive: true });
    expect(stageRef.current).toBeNull();
    expect(rectRef.current).toBeNull();
    await act(() => release());
    await vi.waitFor(() => expect(stageRef.current).toBe(stage));
    expect(rectRef.current).toBe(rect);
    expect(rect.x()).toBe(1);
    expect(active).toEqual({ domLayout: true, domPassive: true, canvasLayout: true, canvasPassive: true });
    view.unmount();
    expect(active).toEqual({ domLayout: false, domPassive: false, canvasLayout: false, canvasPassive: false });
  });

  it.each(['mount', 'update'])('a promise read above Stage activates the DOM Suspense boundary on %s', async (phase) => {
    let release!: (color: string) => void;
    const ready = new Promise<string>((resolve) => { release = resolve; });
    const stageRef = React.createRef<Konva.Stage>();
    const Canvas = ({ fill }: { fill: string }) => {
      const [count, setCount] = React.useState(0);
      return <Rect x={count} fill={fill} onClick={() => setCount((n) => n + 1)} />;
    };
    const Drawing = ({ load }: { load: boolean }) => {
      const fill = load ? React.use(ready) : 'red';
      return <Stage ref={stageRef} width={100} height={100}><Layer><Canvas fill={fill} /></Layer></Stage>;
    };
    const App = ({ load = false }) => (
      <React.Suspense fallback={<p>Loading canvas</p>}>
        <Drawing load={load} />
      </React.Suspense>
    );
    let view!: ReturnType<typeof render>;
    await act(async () => { view = render(<App load={phase === 'mount'} />); });
    const stage = view.stage();
    const rect = stage?.findOne('Rect');
    if (phase === 'update') {
      await act(() => rect!.fire('click'));
      await act(async () => { view.rerender(<App load />); });
    }
    await vi.waitFor(() => expect(view.container.querySelector('p')?.textContent).toBe('Loading canvas'));
    await act(async () => { release('blue'); });
    await vi.waitFor(() => expect(stageRef.current).toBeInstanceOf(Konva.Stage));
    if (phase === 'update') expect(stageRef.current).toBe(stage);
    const readyRect = stageRef.current!.findOne('Rect') as Konva.Rect;
    expect(readyRect.fill()).toBe('blue');
    expect(readyRect.x()).toBe(phase === 'update' ? 1 : 0);
    if (phase === 'update') expect(readyRect).toBe(rect);
    expect(view.container.querySelector('p')).toBeNull();
  });

  it('keeps canvas layout effects disconnected until a suspended DOM sibling is ready', async () => {
    let releaseCanvas!: () => void;
    let releaseDom!: () => void;
    let suspendDom!: () => void;
    const canvasReady = new Promise<void>((resolve) => { releaseCanvas = resolve; });
    const domReady = new Promise<void>((resolve) => { releaseDom = resolve; });
    const stageRef = React.createRef<Konva.Stage>();
    let canvasLayout = false;
    const layoutSetup = vi.fn();
    const Canvas = ({ load }: { load: boolean }) => {
      if (load) React.use(canvasReady);
      React.useLayoutEffect(() => {
        layoutSetup();
        canvasLayout = true;
        return () => { canvasLayout = false; };
      }, []);
      return <Rect name={load ? 'ready' : 'initial'} />;
    };
    const DomSibling = () => {
      const [suspended, setSuspended] = React.useState(false);
      suspendDom = () => setSuspended(true);
      if (suspended) React.use(domReady);
      return null;
    };
    const App = ({ load = false }) => (
      <React.Suspense fallback={<p>Loading</p>}>
        <DomSibling />
        <Stage ref={stageRef} width={100} height={100}>
          <Layer><React.Suspense fallback={<Rect name="loading" />}><Canvas load={load} /></React.Suspense></Layer>
        </Stage>
      </React.Suspense>
    );
    const view = render(<App />);
    const stage = stageRef.current!;
    await act(async () => { view.rerender(<App load />); });
    await act(async () => { suspendDom(); });
    await act(async () => { releaseCanvas(); });
    expect(view.container.querySelector('p')?.textContent).toBe('Loading');
    expect(canvasLayout).toBe(false);
    expect(layoutSetup).toHaveBeenCalledTimes(1);
    expect(stageRef.current).toBeNull();
    await act(async () => { releaseDom(); });
    await vi.waitFor(() => expect(stageRef.current).toBe(stage));
    // The canvas Suspense boundary retries independently of the DOM boundary.
    await vi.waitFor(() => expect(stage.findOne('.ready')).toBeInstanceOf(Konva.Rect));
    expect(canvasLayout).toBe(true);
    expect(layoutSetup).toHaveBeenCalledTimes(2);
    expect(view.container.querySelector('p')).toBeNull();
  });

  it('replaces suspended canvas children without waiting for their obsolete promise', async () => {
    const never = new Promise<void>(() => {});
    const Pending = () => { React.use(never); return <Rect name="old" />; };
    const App = ({ pending = true }) => (
      <React.Suspense fallback={<p>Loading</p>}>
        <Stage width={100} height={100}>
          <Layer>{pending ? <Pending /> : <Rect name="replacement" />}</Layer>
        </Stage>
      </React.Suspense>
    );
    let view!: ReturnType<typeof render>;
    await act(async () => { view = render(<App />); });
    expect(view.container.querySelector('p')).toBeNull();
    expect(view.stage()!.getChildren()).toHaveLength(0);
    await act(async () => { view.rerender(<App pending={false} />); });
    await vi.waitFor(() => expect(view.stage()!.findOne('.replacement')).toBeInstanceOf(Konva.Rect));
    expect(view.container.querySelector('p')).toBeNull();
  });

  it('disposes a suspended canvas without remounting it when its promise resolves', async () => {
    let release!: () => void;
    const ready = new Promise<void>((resolve) => { release = resolve; });
    const Canvas = () => { React.use(ready); return <Rect />; };
    let view!: ReturnType<typeof render>;
    await act(async () => {
      view = render(
        <React.Suspense fallback={<p>Loading</p>}>
          <Stage width={100} height={100}><Layer><Canvas /></Layer></Stage>
        </React.Suspense>,
      );
    });
    expect(view.container.querySelector('p')).toBeNull();
    view.unmount();
    await vi.waitFor(() => expect(Konva.stages).toHaveLength(0));
    await act(async () => { release(); });
    expect(Konva.stages).toHaveLength(0);
  });
});
