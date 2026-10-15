import React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { expect, it } from 'vitest';
import { commands } from 'vitest/browser';
import Konva from 'konva';
// @ts-ignore
import { Stage, Layer, Rect, Transformer } from '#benchmark-source';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = false;

type Owner = 'canvas-root' | 'canvas-leaf' | 'above-stage';
const scenarios = [
  ...[1, 10, 100, 600].flatMap((nodes) =>
    (['canvas-root', 'canvas-leaf', 'above-stage'] as Owner[]).map((owner) => ({
      name: `transform/${nodes}/${owner}`,
      nodes,
      owner,
      rows: 0,
      burst: 1,
      transform: true,
    })),
  ),
  {
    name: 'transform/100/above-stage/1000-dom',
    nodes: 100,
    owner: 'above-stage' as Owner,
    rows: 1000,
    burst: 1,
    transform: true,
  },
  {
    name: 'mousemove/5000/canvas-root/burst-8',
    nodes: 5000,
    owner: 'canvas-root' as Owner,
    rows: 5000,
    burst: 8,
    transform: false,
  },
];

const yieldToBrowser = () =>
  new Promise<void>((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = () => {
      channel.port1.close();
      channel.port2.close();
      resolve();
    };
    channel.port2.postMessage(undefined);
  });

function outlineWidth(tr: Konva.Transformer) {
  return (
    tr.findOne('.bottom-right')!.getAbsolutePosition().x -
    tr.findOne('.top-left')!.getAbsolutePosition().x
  );
}

it('measures complete native interactions', async () => {
  expect((React as any).act).toBeUndefined();
  const events = 24;
  const results = [];
  for (const scenario of scenarios) {
    const samples = [];
    for (let sample = 0; sample < 7; sample++) {
      const container = document.createElement('div');
      container.style.cssText = 'width:800px;height:600px;overflow:hidden';
      document.body.appendChild(container);
      const root = createRoot(container);
      const refs = Array.from({ length: scenario.nodes }, () =>
        React.createRef<Konva.Rect>(),
      );
      const trRef = React.createRef<Konva.Transformer>();
      let step = 0;
      let handlers = 0;
      let ownerEffects = 0;
      let lastCommitAt = 0;
      let committedWidths = Array(scenario.nodes).fill(160);
      let transformerUpdates = 0;
      function recordCommit() {
        ownerEffects++;
        lastCommitAt = performance.now();
      }
      function DomRows({ value }: { value: number }) {
        return (
          <div style={{ height: 200, overflow: 'hidden' }}>
            {Array.from({ length: scenario.rows }, (_, i) => (
              <span key={i} data-value={value}>
                {i + value}
              </span>
            ))}
          </div>
        );
      }
      function Leaf({ index }: { index: number }) {
        const [width, setWidth] = React.useState(160);
        React.useLayoutEffect(() => {
          committedWidths[index] = width;
          recordCommit();
        });
        return (
          <Rect
            ref={refs[index]}
            width={width}
            height={100}
            onTransform={(e) => {
              handlers++;
              e.target.scaleX(1);
              setWidth(160 + step);
            }}
          />
        );
      }
      function Shared() {
        const [widths, setWidths] = React.useState(() =>
          Array(scenario.nodes).fill(160),
        );
        React.useLayoutEffect(() => {
          committedWidths = widths;
          recordCommit();
        });
        const shapes = widths.map((width, index) => {
          const handler = (e) => {
            handlers++;
            if (scenario.transform) e.target.scaleX(1);
            const nextWidth = 160 + step;
            setWidths((previous) => {
              const next = previous.slice();
              next[index] = nextWidth;
              return next;
            });
          };
          return (
            <Rect
              key={index}
              ref={refs[index]}
              width={width}
              height={100}
              fill="red"
              onTransform={scenario.transform ? handler : undefined}
              onMouseMove={
                scenario.transform || index !== scenario.nodes - 1
                  ? undefined
                  : handler
              }
            />
          );
        });
        return scenario.owner === 'above-stage' ? (
          <>
            <DomRows value={widths[0]} />
            <Stage width={800} height={400}>
              <Layer>
                {shapes}
                <Transformer
                  ref={trRef}
                  keepRatio={false}
                  rotateEnabled={false}
                />
              </Layer>
            </Stage>
          </>
        ) : (
          shapes
        );
      }
      try {
        flushSync(() =>
          root.render(
            scenario.owner === 'above-stage' ? (
              <Shared />
            ) : (
              <>
                <DomRows value={160} />
                <Stage width={800} height={400}>
                  <Layer>
                    {scenario.owner === 'canvas-root' ? (
                      <Shared />
                    ) : (
                      refs.map((_, index) => <Leaf key={index} index={index} />)
                    )}
                    {scenario.transform && (
                      <Transformer
                        ref={trRef}
                        keepRatio={false}
                        rotateEnabled={false}
                      />
                    )}
                  </Layer>
                </Stage>
              </>
            ),
          ),
        );
        expect(refs.every((ref) => ref.current)).toBe(true);
        const stage = refs[0].current!.getStage()!;
        const bounds = stage.content.getBoundingClientRect();
        const at = (value: number) => ({
          clientX: bounds.left + 160 + value,
          clientY: bounds.top + 100,
        });
        if (scenario.transform) {
          trRef.current!.nodes(refs.map((ref) => ref.current!));
          const original = trRef.current!.update;
          trRef.current!.update = function () {
            transformerUpdates++;
            return original.call(this);
          };
          stage.setPointersPositions(at(0) as any);
          trRef
            .current!.findOne('.bottom-right')!
            .fire('mousedown', { evt: at(0) });
        } else {
          stage.draw();
        }
        ownerEffects = 0;
        let dispatchMs = 0;
        let settledMs = 0;
        let settledStaleReads = 0;
        let inlineSteps = 0;
        for (let event = 0; event < events; event += scenario.burst) {
          await yieldToBrowser();
          const before = performance.now();
          for (let j = 0; j < scenario.burst; j++) {
            step = event + j + 1;
            if (scenario.transform)
              window.dispatchEvent(new MouseEvent('mousemove', at(step)));
            else
              stage.content.dispatchEvent(
                new MouseEvent('mousemove', {
                  clientX: bounds.left + 40,
                  clientY: bounds.top + 40,
                  bubbles: true,
                }),
              );
          }
          const dispatchedAt = performance.now();
          dispatchMs += dispatchedAt - before;
          // Immediate node writes must not masquerade as a completed React commit.
          if (
            committedWidths[scenario.transform ? 0 : scenario.nodes - 1] ===
            160 + step
          )
            inlineSteps++;
          const ready = () =>
            scenario.transform
              ? committedWidths.every((width) => width === 160 + step)
              : committedWidths[scenario.transform ? 0 : scenario.nodes - 1] ===
                160 + step;
          const deadline = performance.now() + 5000;
          while (!ready() && performance.now() < deadline)
            await yieldToBrowser();
          expect(ready()).toBe(true);
          expect(
            scenario.transform
              ? refs.every((ref) => ref.current!.width() === 160 + step)
              : refs[scenario.nodes - 1].current!.width() === 160 + step,
          ).toBe(true);
          // Include the whole event and the final React commit. With flushing,
          // Konva still finishes its transform step after the layout effect.
          expect(lastCommitAt).toBeGreaterThanOrEqual(before);
          settledMs += Math.max(lastCommitAt, dispatchedAt) - before;
          if (
            scenario.transform &&
            Math.abs(outlineWidth(trRef.current!) - (160 + step)) > 0.01
          )
            settledStaleReads++;
        }
        expect(handlers).toBe(
          events * (scenario.transform ? scenario.nodes : 1),
        );
        expect(settledStaleReads).toBe(0);
        if (scenario.rows) {
          const expected =
            scenario.owner === 'above-stage' ? 160 + events : 160;
          expect(
            Array.from(container.querySelectorAll('span')).every(
              (row) => row.getAttribute('data-value') === String(expected),
            ),
          ).toBe(true);
        }
        if (sample >= 2)
          samples.push({
            dispatchMs,
            settledMs,
            transformerUpdates,
            ownerEffects,
            inlineSteps,
            settledStaleReads,
          });
        if (scenario.transform)
          window.dispatchEvent(new MouseEvent('mouseup', at(events)));
      } finally {
        // Also releases active Transformer listeners if an assertion fails.
        trRef.current?.stopTransform();
        flushSync(() => root.unmount());
        container.remove();
      }
    }
    results.push({ ...scenario, events, samples });
  }
  for (const handler of [false, true]) {
    const samples = [];
    for (let sample = 0; sample < 7; sample++) {
      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = createRoot(container);
      const stageRef = React.createRef<Konva.Stage>();
      let handlers = 0;
      try {
        flushSync(() =>
          root.render(
            <Stage ref={stageRef} width={200} height={200}>
              <Layer>
                <Rect
                  width={100}
                  height={100}
                  fill="red"
                  onMouseMove={
                    handler
                      ? () => {
                          handlers++;
                        }
                      : undefined
                  }
                />
              </Layer>
            </Stage>,
          ),
        );
        const stage = stageRef.current!;
        stage.draw();
        const bounds = stage.content.getBoundingClientRect();
        const event = new MouseEvent('mousemove', {
          clientX: bounds.left + 40,
          clientY: bounds.top + 40,
          bubbles: true,
        });
        const before = performance.now();
        for (let i = 0; i < 10000; i++) stage.content.dispatchEvent(event);
        const dispatchMs = performance.now() - before;
        expect(handlers).toBe(handler ? 10000 : 0);
        if (sample >= 2)
          samples.push({
            dispatchMs,
            settledMs: dispatchMs,
            transformerUpdates: 0,
            ownerEffects: 0,
            inlineSteps: 0,
            settledStaleReads: 0,
          });
      } finally {
        flushSync(() => root.unmount());
        container.remove();
      }
    }
    results.push({
      name: handler ? 'native-noop/10000' : 'native-idle/10000',
      events: 10000,
      samples,
    });
  }
  await commands.saveResults({
    react: React.version,
    konva: Konva.version,
    browser: navigator.userAgent,
    results,
  });
}, 300000);
