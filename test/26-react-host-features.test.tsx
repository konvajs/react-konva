// §26 — React host features inside the canvas renderer.

import * as React from 'react';
import { describe, it, expect, vi } from 'vitest';
import Konva from 'konva';
import { Stage, Layer, Rect } from '../src/ReactKonva';
import { render, act } from './helpers/render';

describe('§26 React host features', () => {
  it('§26.1 Fragment refs stay null while children mount, update, and unmount', () => {
    const ref = React.createRef<React.FragmentInstance>();
    const Canvas = ({ names, fill }: { names: string[]; fill: string }) => (
      <Stage width={100} height={100}>
        <Layer>
          <React.Fragment ref={ref}>
            {names.map((name) => (
              <Rect key={name} name={name} fill={fill} width={10} height={10} />
            ))}
          </React.Fragment>
        </Layer>
      </Stage>
    );
    const { stage, rerender, unmount } = render(<Canvas names={['a']} fill="red" />);
    const canvas = stage()!;
    const first = canvas.findOne('.a') as Konva.Rect;
    expect(first.fill()).toBe('red');
    expect(ref.current).toBeNull();

    rerender(<Canvas names={['b', 'a']} fill="blue" />);
    expect(canvas.findOne('.a')).toBe(first);
    expect(first.fill()).toBe('blue');
    expect(canvas.find('Rect').map((node) => node.name())).toEqual(['b', 'a']);
    expect(ref.current).toBeNull();

    rerender(<Canvas names={['b']} fill="green" />);
    expect(first.getStage()).toBeNull();
    expect(canvas.find('Rect').map((node) => node.name())).toEqual(['b']);

    unmount();
    expect(ref.current).toBeNull();
    expect(canvas.getChildren()).toHaveLength(0);
  });

  it('§26.2 a DOM ViewTransition around Stage preserves canvas updates', async () => {
    let update!: (fill: string) => void;
    const rect = React.createRef<Konva.Rect>();
    const App = () => {
      const [fill, setFill] = React.useState('red');
      update = setFill;
      return (
        <React.ViewTransition>
          <Stage width={100} height={100}>
            <Layer>
              <Rect ref={rect} width={10} height={10} fill={fill} />
            </Layer>
          </Stage>
        </React.ViewTransition>
      );
    };
    render(<App />);
    const first = rect.current!;
    expect(first.fill()).toBe('red');

    await act(() => React.startTransition(() => update('blue')));
    await vi.waitFor(() => {
      expect(rect.current).toBe(first);
      expect(first.fill()).toBe('blue');
    });
  });

  it('§26.3 an empty canvas ViewTransition does not block sibling updates or effects', async () => {
    let update!: (show: boolean) => void;
    const layouts: boolean[] = [];
    const effects: boolean[] = [];
    const rect = React.createRef<Konva.Rect>();
    const Canvas = () => {
      const [show, setShow] = React.useState(false);
      update = setShow;
      React.useLayoutEffect(() => { layouts.push(show); }, [show]);
      React.useEffect(() => { effects.push(show); }, [show]);
      return (
        <Layer>
          {show && <React.ViewTransition />}
          <Rect ref={rect} width={10} height={10} fill={show ? 'blue' : 'red'} />
        </Layer>
      );
    };
    render(<Stage width={100} height={100}><Canvas /></Stage>);

    // React's development performance track must not report animation between
    // these commits. Production and browsers without this API emit no track.
    const timings = typeof console.timeStamp === 'function'
      ? vi.spyOn(console, 'timeStamp')
      : null;
    try {
      for (const show of [true, false]) {
        timings?.mockClear();
        await new Promise(requestAnimationFrame);
        await act(() => React.startTransition(() => update(show)));
        await vi.waitFor(() => {
          expect(rect.current!.fill()).toBe(show ? 'blue' : 'red');
          expect(layouts.at(-1)).toBe(show);
          expect(effects.at(-1)).toBe(show);
        });
        expect(timings?.mock.calls.some(([label]) => label === 'Animating') ?? false).toBe(false);
      }
    } finally {
      timings?.mockRestore();
    }
  });
});
