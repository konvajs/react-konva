// §27 — Hooks owned by the Konva renderer, including mixed DOM/canvas roots.

import * as React from 'react';
import { useFormStatus } from 'react-dom';
import { describe, it, expect, vi } from 'vitest';
import Konva from 'konva';
import { Stage, Layer, Rect } from '../src/ReactKonva';
import { render, act } from './helpers/render';

describe('§27 React hooks', () => {
  it('§27.1 useId stays unique across DOM and Stage roots and stable on updates', () => {
    const stages = [React.createRef<Konva.Stage>(), React.createRef<Konva.Stage>()];
    const Canvas = ({ fill }: { fill: string }) => {
      const id = React.useId();
      return <Rect id={id} width={10} height={10} fill={fill} />;
    };
    const App = ({ fill }: { fill: string }) => {
      const id = React.useId();
      return (
        <>
          <output id={id} />
          {stages.map((ref, index) => (
            <Stage key={index} ref={ref} width={100} height={100}>
              <Layer><Canvas fill={fill} /></Layer>
            </Stage>
          ))}
        </>
      );
    };
    const { container, rerender } = render(<App fill="red" />);
    const ids = () => [
      container.querySelector('output')!.id,
      ...stages.map((ref) => ref.current!.findOne('Rect')!.id()),
    ];
    const initial = ids();
    expect(new Set(initial).size).toBe(3);
    rerender(<App fill="blue" />);
    expect(ids()).toEqual(initial);
  });

  it('§27.2 useFormStatus provides the idle fallback inside Stage', () => {
    const Status = () => {
      const { pending, data, method, action } = useFormStatus();
      return <Rect name={JSON.stringify({ pending, data, method, action })} />;
    };
    const { stage } = render(<Stage width={100} height={100}><Layer><Status /></Layer></Stage>);
    expect(JSON.parse(stage()!.findOne('Rect')!.name())).toEqual({
      pending: false, data: null, method: null, action: null,
    });
  });

  it('§27.4 useEffectEvent reads current props without reconnecting its subscription', async () => {
    const events = new EventTarget();
    const received: string[] = [];
    let subscriptions = 0;
    const Canvas = ({ label }: { label: string }) => {
      const [name, setName] = React.useState('idle');
      const onMessage = React.useEffectEvent(() => {
        received.push(label);
        setName(label);
      });
      React.useEffect(() => {
        subscriptions++;
        const listener = () => onMessage();
        events.addEventListener('message', listener);
        return () => events.removeEventListener('message', listener);
      }, []);
      return <Rect name={name} />;
    };
    const App = ({ label }: { label: string }) => (
      <Stage width={100} height={100}><Layer><Canvas label={label} /></Layer></Stage>
    );
    const view = render(<App label="first" />);
    await act(() => events.dispatchEvent(new Event('message')));
    expect(view.stage()!.findOne('Rect')!.name()).toBe('first');
    view.rerender(<App label="latest" />);
    await act(() => events.dispatchEvent(new Event('message')));
    expect(view.stage()!.findOne('Rect')!.name()).toBe('latest');
    expect(subscriptions).toBe(1);
    view.unmount();
    events.dispatchEvent(new Event('message'));
    expect(received).toEqual(['first', 'latest']);
  });

  it('§27.5 use(context) and useContext receive provider shorthand updates across Stage', () => {
    const Color = React.createContext('black');
    const Canvas = React.memo(() => (
      <Rect fill={React.use(Color)} name={React.useContext(Color)} />
    ));
    const App = ({ color }: { color: string }) => (
      <Color value={color}>
        <Stage width={100} height={100}><Layer><Canvas /></Layer></Stage>
      </Color>
    );
    const view = render(<App color="red" />);
    const rect = view.stage()!.findOne('Rect') as Konva.Rect;
    expect([rect.fill(), rect.name()]).toEqual(['red', 'red']);
    view.rerender(<App color="blue" />);
    expect([rect.fill(), rect.name()]).toEqual(['blue', 'blue']);
  });

  it('§27.6 reducer updates and memoized values and callbacks retain the correct dependencies', async () => {
    let childRenders = 0;
    const Shape = React.memo(({ model, increment }: {
      model: { count: number }; increment: () => void;
    }) => {
      childRenders++;
      return <Rect x={model.count} onClick={increment} />;
    });
    const Counter = ({ step }: { step: number }) => {
      const [count, dispatch] = React.useReducer((n: number, amount: number) => n + amount, 0);
      React.useDebugValue(count);
      const model = React.useMemo(() => ({ count }), [count]);
      const increment = React.useCallback(() => dispatch(step), [step]);
      return <Shape model={model} increment={increment} />;
    };
    const App = ({ step }: { step: number }) => (
      <Stage width={100} height={100}><Layer><Counter step={step} /></Layer></Stage>
    );
    const view = render(<App step={1} />);
    const rect = view.stage()!.findOne('Rect')!;
    view.rerender(<App step={1} />);
    expect(childRenders).toBe(1);
    await act(() => rect.fire('click'));
    expect(rect.x()).toBe(1);
    view.rerender(<App step={2} />);
    await act(() => rect.fire('click'));
    expect(rect.x()).toBe(3);
    const previousRenders = childRenders;
    view.rerender(<App step={2} />);
    expect(childRenders).toBe(previousRenders);
  });

  it('§27.7 insertion effects precede layout effects and clean up on update and unmount', () => {
    const events: string[] = [];
    const Canvas = ({ fill }: { fill: string }) => {
      const ref = React.useRef<Konva.Rect>(null);
      React.useInsertionEffect(() => {
        events.push(`insert ${fill}`);
        return () => { events.push(`remove ${fill}`); };
      }, [fill]);
      React.useLayoutEffect(() => { events.push(`layout ${ref.current!.fill()}`); }, [fill]);
      return <Rect ref={ref} fill={fill} />;
    };
    const App = ({ fill }: { fill: string }) => (
      <Stage width={100} height={100}><Layer><Canvas fill={fill} /></Layer></Stage>
    );
    const view = render(<App fill="red" />);
    view.rerender(<App fill="blue" />);
    view.unmount();
    expect(events).toEqual([
      'insert red', 'layout red', 'remove red', 'insert blue', 'layout blue', 'remove blue',
    ]);
  });

  it('§27.8 DOM form status and payload cross into the matching Stage without affecting other Stages', async () => {
    let release!: () => void;
    const action = () => new Promise<void>((resolve) => { release = resolve; });
    const DomStatus = () => <output>{String(useFormStatus().pending)}</output>;
    const formStage = React.createRef<Konva.Stage>();
    const otherStage = React.createRef<Konva.Stage>();
    const Status = () => {
      const status = useFormStatus();
      return <Rect name={JSON.stringify({
        pending: status.pending,
        value: status.data?.get('color') ?? null,
        method: status.method,
        action: status.action === action,
      })} />;
    };
    const view = render(
      <>
        <form action={action}>
          <DomStatus />
          <input name="color" defaultValue="blue" />
          <Stage ref={formStage} width={100} height={100}><Layer><Status /></Layer></Stage>
        </form>
        <Stage ref={otherStage} width={100} height={100}><Layer><Status /></Layer></Stage>
      </>,
    );
    const statusOf = (ref: React.RefObject<Konva.Stage | null>) => JSON.parse(ref.current!.findOne('Rect')!.name());
    const idle = { pending: false, value: null, method: null, action: false };
    expect(statusOf(formStage)).toEqual(idle);
    const form = view.container.querySelector('form')!;
    form.requestSubmit();
    await vi.waitFor(() => expect(view.container.querySelector('output')!.textContent).toBe('true'));
    expect(statusOf(formStage)).toEqual({
      pending: true, value: 'blue', method: form.method, action: true,
    });
    expect(statusOf(otherStage)).toEqual(idle);
    await act(() => release());
    await vi.waitFor(() => expect(view.container.querySelector('output')!.textContent).toBe('false'));
    expect(statusOf(formStage)).toEqual(idle);
    expect(statusOf(otherStage)).toEqual(idle);
  });
});
