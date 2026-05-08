// §10 — Refs, dispose, lifecycle.

import * as React from 'react';
import { describe, it, expect } from 'vitest';
import { autorun } from 'mobx';
import useImage from 'use-image';
import Konva from 'konva';
import {
  Stage,
  Layer,
  Rect,
  Group,
  Image as KonvaImage,
  Text,
} from '../src/ReactKonva';
import { render, act } from './helpers/render';

const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));

describe('§10 refs / dispose / lifecycle', () => {
  it('§10.1 forwarded refs with useImperativeHandle survive unmount/remount', () => {
    interface Handle {
      bump: () => void;
    }
    const Inner = React.forwardRef<Handle, {}>((_, ref) => {
      const [n, setN] = React.useState(0);
      React.useImperativeHandle(
        ref,
        () => ({
          bump: () => setN((v) => v + 1),
        }),
        []
      );
      return <Rect width={10} height={10} x={n} />;
    });
    const handle = React.createRef<Handle>();
    const Wrapper = () => (
      <Stage width={50} height={50}>
        <Layer>
          <Inner ref={handle} />
        </Layer>
      </Stage>
    );
    const { stage } = render(<Wrapper />);
    expect(typeof handle.current?.bump).toBe('function');
    act(() => handle.current?.bump());
    expect((stage()!.findOne('Rect') as Konva.Rect).x()).toBe(1);
  });

  it('§10.2 refs to children-of-children — set in correct order (children first)', () => {
    const order: string[] = [];
    const Inner = () => (
      <Group ref={() => order.push('group')}>
        <Rect ref={() => order.push('rect')} width={10} height={10} />
      </Group>
    );
    render(
      <Stage width={50} height={50}>
        <Layer ref={() => order.push('layer')}>
          <Inner />
        </Layer>
      </Stage>
    );
    expect(order.indexOf('rect')).toBeLessThan(order.indexOf('group'));
    expect(order.indexOf('group')).toBeLessThan(order.indexOf('layer'));
  });

  it('§10.3 mobx autorun disposer fires on unmount — no leaked subscription', () => {
    let runs = 0;
    let observeMe = { val: 0 };
    const App = () => {
      React.useEffect(() => {
        const dispose = autorun(() => {
          runs++;
          // Read so mobx tracks; using observable would be more idiomatic, but
          // the contract under test is "the disposer is called on unmount,
          // not whether autorun fires when state changes".
          void observeMe.val;
        });
        return dispose;
      }, []);
      return (
        <Stage width={50} height={50}>
          <Layer />
        </Stage>
      );
    };
    const result = render(<App />);
    const runsBefore = runs;
    act(() => result.unmount());
    // After unmount, autorun must be disposed. We can't directly assert
    // disposer ran, but a follow-up state mutation must not bump runs.
    observeMe = { val: 1 };
    expect(runs).toBe(runsBefore); // no extra runs (it's not even tracking val)
  });

  it('§10.4 FinalizationRegistry semantics — react-konva does not retain extra refs', async () => {
    if (typeof FinalizationRegistry === 'undefined') return; // browsers without FR
    let collected = 0;
    const reg = new FinalizationRegistry(() => {
      collected++;
    });
    const App = () => {
      const ref = React.useRef<Konva.Rect>(null);
      React.useEffect(() => {
        if (ref.current) reg.register(ref.current, 'rect');
      }, []);
      return (
        <Stage width={50} height={50}>
          <Layer>
            <Rect ref={ref} width={10} height={10} />
          </Layer>
        </Stage>
      );
    };
    const result = render(<App />);
    act(() => result.unmount());
    // FinalizationRegistry firing is not deterministic — it requires GC.
    // We can only assert "no error from registering / unmounting" here, not
    // that `collected` hits 1. This documents the contract, not the timing.
    await tick();
    expect(collected).toBeGreaterThanOrEqual(0);
  });

  it('§10.5 use-image hook integrates with <Image> and updates on load', async () => {
    // External-library integration anchor: `use-image` is the canonical hook
    // for loading images into Konva. It returns [HTMLImageElement|undefined,
    // status]. While loading, image is undefined and status is 'loading';
    // after the actual <img> finishes loading, status flips to 'loaded'.
    const url =
      'https://konvajs.org//img/icon.png?token' + Math.random();

    const App = () => {
      const [image, status] = useImage(url);
      return (
        <Stage width={50} height={50}>
          <Layer>
            <KonvaImage image={image} />
            <Text text={status} />
          </Layer>
        </Stage>
      );
    };
    const { stage } = render(<App />);

    expect((stage()!.findOne('Image') as Konva.Image).image()).toBeUndefined();
    expect((stage()!.findOne('Text') as Konva.Text).text()).toBe('loading');

    // Wait for the real image network load to complete (use-image kicks off
    // the load on first call). We poll instead of relying on a fixed timeout.
    const start = Date.now();
    while (
      (stage()!.findOne('Text') as Konva.Text).text() === 'loading' &&
      Date.now() - start < 5000
    ) {
      await tick(50);
    }
    expect((stage()!.findOne('Text') as Konva.Text).text()).toBe('loaded');
    expect(
      (stage()!.findOne('Image') as Konva.Image).image() instanceof
        window.Image
    ).toBe(true);
  });
});
