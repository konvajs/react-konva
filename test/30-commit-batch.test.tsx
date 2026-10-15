import * as React from 'react';
import { expect, it, vi } from 'vitest';
import Konva from 'konva';
import { Stage, Layer, Group, Rect, Transformer } from '../src/ReactKonva';
import { render, act } from './helpers/render';

const beginUpdateBatch = (Konva as typeof Konva & {
  beginUpdateBatch?: () => () => void;
}).beginUpdateBatch;

it.skipIf(!beginUpdateBatch).each([
  ['dom', false],
  ['konva', false],
  ['dom', true],
  ['konva', true],
] as const)(
  'coalesces a multi-node commit with %s state (selected group: %s)',
  async (owner, selectedGroup) => {
    const refs = Array.from({ length: 3 }, () =>
      React.createRef<Konva.Rect>(),
    );
    const groupRef = React.createRef<Konva.Group>();
    const trRef = React.createRef<Konva.Transformer>();
    let change!: (width: number) => void;
    let layoutWidth = 0;
    function Content() {
      const [width, setWidth] = React.useState(10);
      change = setWidth;
      React.useLayoutEffect(() => {
        trRef.current!.nodes(
          selectedGroup ? [groupRef.current!] : refs.map((ref) => ref.current!),
        );
      }, []);
      React.useLayoutEffect(() => {
        layoutWidth = trRef.current!.findOne('.top-center')!.x() * 2;
      });
      const shapes = (
        <Layer>
          <Group ref={groupRef}>
            {refs.map((ref, i) => (
              <Rect key={i} ref={ref} x={i * 20} width={width} height={10} />
            ))}
          </Group>
          <Transformer ref={trRef} />
        </Layer>
      );
      return owner === 'dom' ? (
        <Stage width={500} height={200}>{shapes}</Stage>
      ) : (
        shapes
      );
    }
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
    // Automatic refreshes bypass public update(); count the actual work.
    const refresh = vi.spyOn(tr as any, '_update');
    const bounds = vi.spyOn(tr as any, '__getNodeRect');
    try {
      for (const width of [15, 20]) {
        refresh.mockClear();
        bounds.mockClear();
        await act(() => change(width));
        expect(refs.every((ref) => ref.current!.width() === width)).toBe(true);
        expect(layoutWidth).toBe(40 + width);
        expect(tr.findOne('.top-center')!.x() * 2).toBe(layoutWidth);
        expect(refresh).toHaveBeenCalledTimes(1);
        expect(bounds).toHaveBeenCalledTimes(1);
      }
    } finally {
      refresh.mockRestore();
      bounds.mockRestore();
    }
  },
);

it('commits normally when Konva has no update-batch API', () => {
  const descriptor = Object.getOwnPropertyDescriptor(Konva, 'beginUpdateBatch');
  Object.defineProperty(Konva, 'beginUpdateBatch', {
    configurable: true,
    value: undefined,
  });
  try {
    const ref = React.createRef<Konva.Rect>();
    const trRef = React.createRef<Konva.Transformer>();
    let layoutWidth = 0;
    function App({ width }: { width: number }) {
      React.useLayoutEffect(() => {
        trRef.current!.nodes([ref.current!]);
      }, []);
      React.useLayoutEffect(() => {
        layoutWidth = trRef.current!.findOne('.top-center')!.x() * 2;
      });
      return (
        <Stage width={100} height={100}>
          <Layer>
            <Rect ref={ref} width={width} height={10} />
            <Transformer ref={trRef} />
          </Layer>
        </Stage>
      );
    }
    const view = render(<App width={10} />);
    view.rerender(<App width={20} />);
    expect(ref.current!.width()).toBe(20);
    expect(layoutWidth).toBe(20);
    view.unmount();
  } finally {
    if (descriptor) Object.defineProperty(Konva, 'beginUpdateBatch', descriptor);
    else delete (Konva as any).beginUpdateBatch;
  }
});
