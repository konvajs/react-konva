import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { afterAll, expect, it, vi } from 'vitest';
import { commands } from 'vitest/browser';
import Konva from 'konva';
import { runInAction } from 'mobx';
// @ts-ignore — selected by the benchmark config, as in the timing benchmarks.
import {
  Stage,
  Layer,
  Group,
  Rect,
  Transformer,
  KonvaRenderer,
} from '#benchmark-source';

vi.mock('react-dom', { spy: true });

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = false;

const results = [];
type Owner = 'canvas-root' | 'canvas-leaf' | 'above-stage';
const owners: Owner[] = ['canvas-root', 'canvas-leaf', 'above-stage'];
const scenarios = [
  ...[1, 10, 100, 600].flatMap((nodes) =>
    owners.map((owner) => ({
      operation: 'resize',
      nodes,
      owner,
      domRows: 0,
      siblings: 0,
      depth: 0,
    })),
  ),
  {
    operation: 'resize',
    nodes: 100,
    owner: 'above-stage' as Owner,
    domRows: 1000,
    siblings: 0,
    depth: 0,
  },
  {
    operation: 'resize',
    nodes: 1,
    owner: 'canvas-leaf' as Owner,
    domRows: 5000,
    siblings: 5000,
    depth: 10,
  },
  ...owners.map((owner) => ({
    operation: 'update',
    nodes: 100,
    owner,
    domRows: 0,
    siblings: 0,
    depth: 0,
  })),
  ...[1, 100].flatMap((nodes) =>
    owners.map((owner) => ({
      operation: 'drag',
      nodes,
      owner,
      domRows: 0,
      siblings: 0,
      depth: 0,
    })),
  ),
  ...['noop', 'idle', 'native-noop', 'native-idle'].map((operation) => ({
    operation,
    nodes: 100,
    owner: 'canvas-root' as Owner,
    domRows: 1000,
    siblings: 0,
    depth: 0,
  })),
  ...['resize', 'drag'].flatMap((operation) =>
    owners.map((owner) => ({
      operation,
      nodes: 100,
      owner,
      domRows: owner === 'above-stage' ? 1000 : 0,
      siblings: 0,
      depth: 0,
      content: true,
    })),
  ),
  ...['resize', 'drag'].flatMap((operation) =>
    owners.map((owner) => ({
      operation,
      nodes: 100,
      owner,
      domRows: owner === 'above-stage' ? 1000 : 0,
      siblings: 0,
      depth: 0,
      customBatch: true,
    })),
  ),
  ...['native-noop', 'native-idle'].map((operation) => ({
    operation,
    nodes: 100,
    owner: 'canvas-root' as Owner,
    domRows: 1000,
    siblings: 0,
    depth: 0,
    customBatch: true,
  })),
].map((scenario) => ({
  ...scenario,
  content: 'content' in scenario && scenario.content,
  customBatch: 'customBatch' in scenario && scenario.customBatch,
  name: `${scenario.operation}/${scenario.nodes}/${scenario.owner}/dom-${scenario.domRows}/siblings-${scenario.siblings}${'content' in scenario ? '/content' : ''}${'customBatch' in scenario ? '/custom-batch' : ''}`,
}));
const emptyCounts = () => ({
  handlers: 0,
  domCommits: 0,
  canvasCommits: 0,
  stateOwnerRenders: 0,
  transformerUpdates: 0,
  transformerRefreshes: 0,
  selectionBounds: 0,
  anchorSetAttrs: 0,
  nodeClientRects: 0,
  rendererFlushes: 0,
  eventBatches: 0,
  domFlushes: 0,
  customBatches: 0,
});

it.each(scenarios)('$name', async (scenario) => {
  const { nodes, owner, operation } = scenario;
  const dragging = operation === 'drag';
  const nativeMove = operation === 'native-noop' || operation === 'native-idle';
  const noUpdate = nativeMove || operation === 'noop' || operation === 'idle';
  const initialValue = dragging ? 0 : 160;
  let counts = emptyCounts();
  const customBatch = (run: () => void) => {
    counts.customBatches++;
    runInAction(run);
  };
  let passed = false;
  const steps = [];
  const refs = Array.from({ length: nodes }, () =>
    React.createRef<Konva.Rect>(),
  );
  const trRef = React.createRef<Konva.Transformer>();
  const setters: ((value: number) => void)[] = [];
  let committedValues = Array(nodes).fill(initialValue);
  const onRender: React.ProfilerOnRenderCallback = (id) => {
    if (id === 'dom') counts.domCommits++;
    else counts.canvasCommits++;
  };

  function shape(i: number, value: number, setValue: (value: number) => void) {
    setters[i] = setValue;
    return (
      <Rect
        key={i}
        ref={refs[i]}
        width={dragging ? 160 : value}
        x={dragging ? value : 0}
        height={100}
        draggable={dragging}
        fill={nativeMove ? 'red' : undefined}
        onMouseMove={
          operation.endsWith('noop')
            ? () => {
                counts.handlers++;
              }
            : undefined
        }
        onDragMove={
          dragging
            ? (e) => {
                counts.handlers++;
                setValue(e.target.x());
              }
            : undefined
        }
        onTransform={(e) => {
          counts.handlers++;
          const node = e.target;
          const nextWidth = node.width() * node.scaleX();
          node.scaleX(1);
          setValue(nextWidth);
        }}
      />
    );
  }

  function LocalShape({ index }: { index: number }) {
    counts.stateOwnerRenders++;
    const [value, setValue] = React.useState(initialValue);
    React.useLayoutEffect(() => {
      committedValues[index] = value;
    });
    return shape(index, value, setValue);
  }

  function Shared() {
    counts.stateOwnerRenders++;
    const [values, setValues] = React.useState(() =>
      Array(nodes).fill(initialValue),
    );
    // This tracks committed state, not the number of commits. Profiler counts those.
    React.useLayoutEffect(() => {
      committedValues = values;
    });
    const shapes = values.map((value, i) =>
      shape(i, value, (next) => {
        setValues((previous) =>
          previous.map((old, index) => (index === i ? next : old)),
        );
      }),
    );
    return owner === 'above-stage' ? (
      <>
        <DomRows value={values[0]} />
        <Canvas>{shapes}</Canvas>
      </>
    ) : (
      shapes
    );
  }

  function DomRows({ value }: { value: number }) {
    return (
      <div style={{ height: 100, overflow: 'hidden' }}>
        <output>{value}</output>
        {Array.from({ length: scenario.domRows }, (_, i) => (
          <span key={i} data-value={value}>
            {value}
          </span>
        ))}
      </div>
    );
  }

  function Canvas({ children }: { children: React.ReactNode }) {
    for (let i = 0; i < scenario.depth; i++)
      children = <Group>{children}</Group>;
    return (
      <Stage width={600} height={300}
        eventBatchFunc={scenario.customBatch ? customBatch : undefined}>
        <React.Profiler id="canvas" onRender={onRender}>
          <Layer>
            {Array.from({ length: scenario.siblings }, (_, i) => (
              <Rect key={i} x={500} y={200} width={1} height={1} />
            ))}
            {children}
            <Transformer ref={trRef} keepRatio={false} rotateEnabled={false} />
          </Layer>
        </React.Profiler>
      </Stage>
    );
  }

  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const spies: { mockRestore: () => void }[] = [];
  try {
    flushSync(() =>
      root.render(
        <React.Profiler id="dom" onRender={onRender}>
          {owner === 'above-stage' ? (
            <Shared />
          ) : (
            <>
              <DomRows value={initialValue} />
              <Canvas>
                {owner === 'canvas-root' ? (
                  <Shared />
                ) : (
                  refs.map((_, index) => (
                    <LocalShape key={index} index={index} />
                  ))
                )}
              </Canvas>
            </>
          )}
        </React.Profiler>,
      ),
    );
    expect(counts.domCommits, 'React DOM profiling must be enabled').toBe(1);
    expect(
      counts.canvasCommits,
      'Konva reconciler profiling must be enabled',
    ).toBe(1);
    const tr = trRef.current!;
    tr.nodes(refs.map((ref) => ref.current!));

    const update = tr.update;
    spies.push(
      vi.spyOn(tr, 'update').mockImplementation(function () {
        counts.transformerUpdates++;
        return update.call(this);
      }),
    );
    // Automatic refreshes bypass public update(); count their real work too.
    for (const [method, counter] of [
      ['_update', 'transformerRefreshes'],
      ['__getNodeRect', 'selectionBounds'],
    ] as const) {
      const original = (tr as any)[method];
      if (typeof original !== 'function') continue;
      spies.push(
        vi.spyOn(tr as any, method).mockImplementation(function (...args) {
          counts[counter]++;
          return original.apply(this, args);
        }),
      );
    }
    for (const anchor of tr.find('._anchor')) {
      const setAttrs = anchor.setAttrs;
      spies.push(
        vi.spyOn(anchor, 'setAttrs').mockImplementation(function (...args) {
          counts.anchorSetAttrs++;
          return setAttrs.apply(this, args);
        }),
      );
    }
    for (const ref of refs) {
      const node = ref.current!;
      const getClientRect = node.getClientRect;
      spies.push(
        vi.spyOn(node, 'getClientRect').mockImplementation(function (...args) {
          counts.nodeClientRects++;
          return getClientRect.apply(this, args);
        }),
      );
    }
    const flush = KonvaRenderer.flushSyncWork;
    spies.push(
      vi.spyOn(KonvaRenderer, 'flushSyncWork').mockImplementation((...args) => {
        counts.rendererFlushes++;
        return flush(...args);
      }),
    );

    const stage = tr.getStage()!;
    const batch = stage.eventBatchFunc?.();
    if (batch)
      stage.eventBatchFunc((run) => {
        counts.eventBatches++;
        batch(run);
      });
    if (nativeMove) {
      tr.visible(false);
      stage.draw();
    }
    const bounds = stage.content.getBoundingClientRect();
    const at = (dx: number) => ({
      clientX: bounds.left + 160 + dx,
      clientY: bounds.top + 100,
      bubbles: true,
    });
    const down = new MouseEvent('mousedown', at(0));
    stage.setPointersPositions(down);
    if (operation === 'resize') {
      if (scenario.content) {
        stage.draw();
        stage.content.dispatchEvent(down);
      } else tr.findOne('.bottom-right')!.fire('mousedown', { evt: down });
    }
    if (dragging) {
      // Start every selected node before measuring. This excludes drag-start
      // propagation and measures one complete multi-node dragmove step.
      for (const ref of refs) ref.current!.startDrag({ evt: down });
    }

    // Native browser input arrives after the mount microtasks have finished.
    await Promise.resolve();
    for (let step = 1; step <= 3; step++) {
      counts = emptyCounts();
      const domFlushStart = vi.mocked(flushSync).mock.calls.length;
      // No act() or flushSync() around measured input: preserve renderer scheduling.
      const expectedValue = initialValue + (noUpdate ? 0 : step * 10);
      if (operation === 'update')
        setters.forEach((setValue) => setValue(expectedValue));
      else if (nativeMove)
        stage.content.dispatchEvent(
          new MouseEvent('mousemove', {
            bubbles: true,
            clientX: bounds.left + 40,
            clientY: bounds.top + 40,
          }),
        );
      else if (operation === 'noop')
        refs.forEach((ref) => ref.current!.fire('mousemove'));
      else
        (scenario.content ? stage.content : window).dispatchEvent(
          new MouseEvent('mousemove', at(step * 10)),
        );
      const checkState = () => {
        for (const value of committedValues)
          expect(value).toBeCloseTo(expectedValue);
      };
      if (operation === 'resize' || dragging) checkState();
      else await vi.waitFor(checkState);
      counts.domFlushes =
        vi.mocked(flushSync).mock.calls.length - domFlushStart;
      const measured = { ...counts };
      steps.push(measured);

      // Check correctness after measuring so validation reads do not add work.
      for (const ref of refs) {
        expect(ref.current!.width()).toBeCloseTo(
          dragging ? 160 : expectedValue,
        );
        expect(ref.current!.x()).toBeCloseTo(dragging ? expectedValue : 0);
        expect(ref.current!.scaleX()).toBe(1);
      }
      const left = tr.findOne('.top-left')!.getAbsolutePosition().x;
      const right = tr.findOne('.bottom-right')!.getAbsolutePosition().x;
      expect(left).toBeCloseTo(dragging ? expectedValue : 0);
      expect(
        right - left,
        'stale geometry must not count as an optimization',
      ).toBeCloseTo(dragging ? 160 : expectedValue);
      expect(measured.handlers).toBe(
        operation === 'native-noop'
          ? 1
          : (noUpdate && operation !== 'noop') || operation === 'update'
            ? 0
            : nodes,
      );
      expect(measured.canvasCommits).toBe(noUpdate ? 0 : 1);
      expect(measured.domCommits).toBe(
        !noUpdate && owner === 'above-stage' ? 1 : 0,
      );
      expect(measured.stateOwnerRenders).toBe(
        noUpdate ? 0 : owner === 'canvas-leaf' ? nodes : 1,
      );
      const domValue = owner === 'above-stage' ? expectedValue : initialValue;
      expect(
        Number(container.querySelector('output')!.textContent),
      ).toBeCloseTo(domValue);
      const rows = container.querySelectorAll('span');
      expect(rows).toHaveLength(scenario.domRows);
      for (const row of rows)
        expect(Number(row.getAttribute('data-value'))).toBeCloseTo(domValue);
      // Current ceilings, not the desired final algorithm. Improvements can use less work.
      const updateLimit = noUpdate ? 0 : operation === 'resize' ? 2 : 1;
      expect(measured.transformerUpdates).toBeLessThanOrEqual(updateLimit);
      if (typeof (Konva as any).beginUpdateBatch === 'function') {
        expect(measured.transformerRefreshes).toBeLessThanOrEqual(updateLimit);
        // Multi-node drag also measures the box while positioning the nodes.
        const boundsLimit = dragging && nodes > 1 ? 2 : updateLimit;
        expect(measured.selectionBounds).toBeLessThanOrEqual(boundsLimit);
      }
      // Nine anchors receive defaults and layout once per full refresh.
      expect(measured.anchorSetAttrs).toBeLessThanOrEqual(updateLimit * 18);
      const rectReadLimit = noUpdate
        ? 0
        : operation === 'update'
          ? nodes
          : nodes * (dragging && nodes === 1 ? 1 : 2);
      expect(measured.nodeClientRects).toBeLessThanOrEqual(rectReadLimit);
      // Only Stage's existing DOM-to-canvas bridge needs an explicit flush.
      expect(measured.rendererFlushes).toBeLessThanOrEqual(
        !noUpdate && owner === 'above-stage' ? 1 : 0,
      );
      // Resize preserves the anchor's native drag-cancel listener before the
      // Transformer listener. Only the latter normally schedules React work.
      expect(measured.eventBatches).toBeLessThanOrEqual(
        (operation === 'resize' ? 2 : dragging || nativeMove ? 1 : 0) +
          (scenario.content ? 1 : 0),
      );
      // One native DOM scope plus one scope for scheduled canvas work; resize
      // also preserves Konva's separate anchor drag-cancel listener.
      expect(measured.domFlushes).toBeLessThanOrEqual(
        (operation === 'resize' ? 3 : dragging ? 2 : nativeMove ? 1 : 0) +
          (scenario.content ? 1 : 0),
      );
      expect(measured.customBatches).toBe(
        scenario.customBatch ? measured.eventBatches : 0,
      );
    }
    passed = true;
  } finally {
    results.push({ ...scenario, passed, steps });
    trRef.current?.stopTransform();
    window.dispatchEvent(new MouseEvent('mouseup'));
    for (const spy of spies) spy.mockRestore();
    flushSync(() => root.unmount());
    container.remove();
    expect(Konva.stages).toHaveLength(0);
  }
});

afterAll(async () => {
  await commands.saveCounts({
    react: React.version,
    konva: Konva.version,
    browser: navigator.userAgent,
    results,
  });
});
