import * as React from 'react';
import { expect, it } from 'vitest';
import Konva from 'konva';
import { Stage, Layer, Group, Rect, Transformer } from '../src/ReactKonva';
import { render } from './helpers/render';

// A Transformer attached to a Group measures the Group from its children.
// When onTransform moves the Group's scale into the children's state, every
// later step must scale from the committed child size, not the old one.
// Needs Konva 10.7.1+, where a Transformer observes an attached Group's subtree.
it.each(['dom', 'konva'] as const)(
  'Group resize through child state follows the pointer with %s state',
  (owner) => {
    const groupRef = React.createRef<Konva.Group>();
    const rectRef = React.createRef<Konva.Rect>();
    const trRef = React.createRef<Konva.Transformer>();
    const Content = () => {
      const [size, setSize] = React.useState({ width: 160, height: 160 });
      React.useLayoutEffect(() => {
        trRef.current!.nodes([groupRef.current!]);
      }, []);
      const shapes = (
        <Layer>
          <Group
            ref={groupRef}
            x={80}
            y={80}
            onTransform={(e: any) => {
              const group = e.target;
              const sx = group.scaleX();
              const sy = group.scaleY();
              group.scale({ x: 1, y: 1 });
              setSize((s) => ({ width: s.width * sx, height: s.height * sy }));
            }}
          >
            <Rect ref={rectRef} {...size} fill="tomato" />
          </Group>
          <Transformer ref={trRef} keepRatio={false} rotateEnabled={false} />
        </Layer>
      );
      return owner === 'dom' ? (
        <Stage width={600} height={600}>
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
        <Stage width={600} height={600}>
          <Content />
        </Stage>
      ),
    );
    const stage = Konva.stages[Konva.stages.length - 1];
    const anchor = trRef.current!.findOne('.bottom-right')!;
    const crect = stage.content.getBoundingClientRect();
    const ap = anchor.getAbsolutePosition();
    const at = (d: number) => ({
      clientX: ap.x + d + crect.left,
      clientY: ap.y + d + crect.top,
    });
    stage.setPointersPositions(at(0) as any);
    anchor.fire('mousedown', { evt: at(0) } as any);
    try {
      for (let d = 10; d <= 60; d += 10) {
        window.dispatchEvent(new MouseEvent('mousemove', at(d)));
        expect(groupRef.current!.scaleX()).toBe(1);
        expect(rectRef.current!.width()).toBeCloseTo(160 + d);
        expect(rectRef.current!.height()).toBeCloseTo(160 + d);
      }
    } finally {
      window.dispatchEvent(new MouseEvent('mouseup', at(60)));
    }
  },
);
