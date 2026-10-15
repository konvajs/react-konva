import * as React from 'react';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { flushSync } from 'react-dom';
import Konva from 'konva';
import { Stage, Layer, Rect, Transformer } from '../src/ReactKonva';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = false;

const roots: { root: Root; container: HTMLElement }[] = [];
function mount(ui: React.ReactElement) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  flushSync(() => root.render(ui));
  roots.push({ root, container });
}
let errors: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  errors = vi.spyOn(console, 'error');
});
afterEach(() => {
  while (roots.length) {
    const { root, container } = roots.pop()!;
    flushSync(() => root.unmount());
    container.remove();
  }
  const leaked = Konva.stages.length;
  [...Konva.stages].forEach((stage) => stage.destroy());
  const calls = errors.mock.calls;
  errors.mockRestore();
  expect(leaked, 'Stage cleanup').toBe(0);
  expect(calls, 'unexpected React errors').toEqual([]);
});

const raf = () => new Promise((r) => requestAnimationFrame(r));

// Transformer outline width as drawn: distance between corner anchors.
function outlineWidth(tr: Konva.Transformer) {
  const tl = tr.findOne('.top-left')!.getAbsolutePosition();
  const br = tr.findOne('.bottom-right')!.getAbsolutePosition();
  return br.x - tl.x;
}

function setupTransformBox(
  stateOwner: 'konva' | 'dom' = 'konva',
  normalizeImmediately = false,
) {
  let rectNode!: Konva.Rect;
  let trNode!: Konva.Transformer;
  let committedOutline = 0;
  let committedBox!: { x: number; y: number; width: number; height: number };
  const Box = () => {
    const [box, setBox] = React.useState({
      x: 80,
      y: 80,
      width: 160,
      height: 160,
    });
    React.useLayoutEffect(() => {
      committedBox = box;
      if (trRef.current?.isTransforming()) {
        committedOutline = trRef.current.findOne('.top-center')!.x() * 2;
      }
    });
    const rectRef = React.useRef<Konva.Rect>(null);
    const trRef = React.useRef<Konva.Transformer>(null);
    React.useLayoutEffect(() => {
      rectNode = rectRef.current!;
      trNode = trRef.current!;
      trRef.current!.nodes([rectRef.current!]);
    }, []);
    const shapes = (
      <>
        <Rect
          ref={rectRef}
          {...box}
          fill="tomato"
          onTransform={(e: any) => {
            // The standard react-konva transform pattern: bake scale into
            // state-driven width/height, reset scale on the node.
            const node = e.target;
            const sx = node.scaleX();
            const sy = node.scaleY();
            node.scaleX(1);
            node.scaleY(1);
            const next = {
              x: node.x(),
              y: node.y(),
              width: Math.max(5, node.width() * sx),
              height: Math.max(5, node.height() * sy),
            };
            if (normalizeImmediately) node.setAttrs(next);
            setBox(next);
          }}
        />
        <Transformer ref={trRef} keepRatio={false} rotateEnabled={false} />
      </>
    );
    return stateOwner === 'dom' ? (
      <Stage width={600} height={600}>
        <Layer>{shapes}</Layer>
      </Stage>
    ) : (
      shapes
    );
  };
  mount(
    stateOwner === 'dom' ? (
      <Box />
    ) : (
      <Stage width={600} height={600}>
        <Layer>
          <Box />
        </Layer>
      </Stage>
    ),
  );
  const stage = Konva.stages[Konva.stages.length - 1];

  // Start a real transform on the bottom-right anchor (Konva's own path:
  // anchor mousedown installs window mousemove/mouseup listeners).
  const anchor = trNode.findOne('.bottom-right')!;
  const crect = stage.content.getBoundingClientRect();
  const ap = anchor.getAbsolutePosition(); // (240, 240)
  const at = (dx: number, dy = 0) => ({
    clientX: ap.x + dx + crect.left,
    clientY: ap.y + dy + crect.top,
  });
  stage.setPointersPositions(at(0) as any);
  anchor.fire('mousedown', { evt: at(0) } as any);
  const move = (dx: number, dy = 0) =>
    window.dispatchEvent(new MouseEvent('mousemove', at(dx, dy)));
  const up = (dx: number) =>
    window.dispatchEvent(new MouseEvent('mouseup', at(dx)));

  return {
    rect: () => rectNode,
    tr: () => trNode,
    committed: () => committedBox,
    committedOutline: () => committedOutline,
    move,
    up,
  };
}

describe('Transformer with controlled state', () => {
  it('state above Stage settles before the next animation frame', async () => {
    const { rect, tr, move, up } = setupTransformBox('dom');
    try {
      move(40);
      await raf();
      expect(rect().width()).toBe(200);
      expect(outlineWidth(tr())).toBe(200);
      move(80);
      await raf();
      expect(rect().width()).toBe(240);
      expect(outlineWidth(tr())).toBe(240);
    } finally {
      up(80);
    }
  });

  it('state inside Stage also updates the Transformer before each frame', async () => {
    const { rect, tr, move, up } = setupTransformBox();
    try {
      // Frame 1: drag bottom-right +40px.
      move(40);
      await raf();
      expect(rect().width()).toBe(200);
      expect(outlineWidth(tr())).toBe(200);

      // Frame 2: +40 more. (Stale-read bug: outline lags one event behind.)
      move(80);
      await raf();
      expect(rect().width()).toBe(240);
      expect(outlineWidth(tr())).toBe(240);
    } finally {
      up(80);
    }
  });

  it('state above Stage keeps the outline current after React commits during a gesture', async () => {
    const { rect, tr, move, up } = setupTransformBox('dom');
    try {
      move(40);
      // Wait for React's normal commit without forcing it or imposing a frame
      // deadline. The outline must follow even while the gesture is active.
      await vi.waitFor(() => expect(rect().width()).toBe(200));
      expect(tr().isTransforming()).toBe(true);
      expect(outlineWidth(tr())).toBe(200);

      move(80);
      await vi.waitFor(() => expect(rect().width()).toBe(240));
      expect(outlineWidth(tr())).toBe(240);
    } finally {
      up(80);
    }
  });

  it('legacy timing: state inside Stage is visible immediately after the event', () => {
    // Preserve original §17.2: a complete native step commits before returning.
    const { rect, move, up } = setupTransformBox();
    try {
      move(40);
      expect(rect().width()).toBe(200);
      expect(rect().scaleX()).toBe(1);
    } finally {
      up(40);
    }
  });

  it.each(['dom', 'konva'] as const)(
    'immediate normalization keeps geometry correct with %s state',
    async (owner) => {
      const { rect, tr, committed, move, up } = setupTransformBox(owner, true);
      try {
        for (const [dx, dy] of [
          [40, 20],
          [80, 40],
        ]) {
          move(dx, dy);
          // Node geometry and anchors agree before React commits, then remain
          // correct when React records the same normalized dimensions.
          expect(rect().width()).toBeCloseTo(160 + dx);
          expect(rect().height()).toBeCloseTo(160 + dy);
          expect(rect().scaleX()).toBe(1);
          expect(rect().scaleY()).toBe(1);
          expect(outlineWidth(tr())).toBeCloseTo(160 + dx);
          await vi.waitFor(() => {
            expect(committed().width).toBeCloseTo(160 + dx);
            expect(committed().height).toBeCloseTo(160 + dy);
          });
          expect(rect().width()).toBeCloseTo(committed().width);
          expect(rect().height()).toBeCloseTo(committed().height);
          expect(outlineWidth(tr())).toBeCloseTo(committed().width);
          expect(tr().isTransforming()).toBe(true);
        }
      } finally {
        up(80);
      }
    },
  );
});

// Layout effects and completed native events see the committed anchor layout,
// including while a resize gesture is still active.
it.each(['dom', 'konva'] as const)(
  'controlled resize exposes committed anchors to layout effects with %s state',
  (owner) => {
    const { rect, tr, move, up, committedOutline } = setupTransformBox(owner);
    try {
      move(40);
      expect(rect().width()).toBe(200);
      expect(committedOutline()).toBe(200);
      expect(outlineWidth(tr())).toBe(200);
    } finally {
      up(40);
    }
  },
);
