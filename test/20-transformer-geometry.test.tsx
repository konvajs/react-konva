import * as React from 'react';
import { expect, it } from 'vitest';
import Konva from 'konva';
import { Stage, Layer, Rect, Transformer } from '../src/ReactKonva';
import { render, act } from './helpers/render';

it.each(['dom', 'konva'] as const)(
  'exposes fresh bounds to listeners and committed anchors to effects with %s state',
  async (owner) => {
    const refs = Array.from({ length: 20 }, () =>
      React.createRef<Konva.Rect>(),
    );
    const trRef = React.createRef<Konva.Transformer>();
    let change!: (width: number) => void;
    let readInLayout = 0;
    const Content = () => {
      const [width, setWidth] = React.useState(10);
      change = setWidth;
      React.useLayoutEffect(() => {
        trRef.current!.nodes(refs.map((r) => r.current!));
      }, []);
      React.useLayoutEffect(() => {
        readInLayout = trRef.current!.findOne('.top-center')!.x();
      });
      const shapes = (
        <Layer>
          {refs.map((ref, i) => (
            <Rect key={i} ref={ref} x={i * 20} width={width} height={10} />
          ))}
          <Transformer ref={trRef} />
        </Layer>
      );
      return owner === 'dom' ? (
        <Stage width={500} height={200}>
          {shapes}
        </Stage>
      ) : (
        shapes
      );
    };
    render(
      owner === 'dom' ? (
        <Content />
      ) : (
        <Stage width={500} height={200}>
          <Content />
        </Stage>
      ),
    );
    const tr = trRef.current!;
    let readInListener:
      | { nodeWidth: number; selectionWidth: number }
      | undefined;
    const lastNode = refs[refs.length - 1].current!;
    lastNode.on('widthChange.probe', () => {
      // Change listeners run during mutation. Bounds are computed on read;
      // Konva may defer its anchor layout until the batch finishes.
      readInListener = {
        nodeWidth: lastNode.width(),
        selectionWidth: tr.width(),
      };
    });
    await act(() => change(15));
    expect(refs.every((ref) => ref.current!.width() === 15)).toBe(true);
    expect(readInListener).toEqual({ nodeWidth: 15, selectionWidth: 395 });
    // Raw anchor reads must be current after commit, without forcing a refresh.
    expect(readInLayout).toBe(197.5);
    expect(tr.findOne('.top-center')!.x()).toBe(197.5);
  },
);
