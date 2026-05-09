// §10 — Refs, dispose, lifecycle.

import * as React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { autorun, observable, runInAction } from 'mobx';
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

// 1×1 transparent PNG, embedded so the test never touches the network.
const TINY_PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkAAIAAAoAAv/lxKUAAAAASUVORK5CYII=';

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
    const store = observable({ val: 0 });
    const disposeSpy = vi.fn();
    const App = () => {
      React.useEffect(() => {
        const dispose = autorun(() => {
          runs++;
          // Real observable read — mobx tracks this dep, so a later runInAction
          // would re-fire autorun if (and only if) the disposer never ran.
          void store.val;
        });
        return () => {
          disposeSpy();
          dispose();
        };
      }, []);
      return (
        <Stage width={50} height={50}>
          <Layer />
        </Stage>
      );
    };
    const result = render(<App />);
    expect(runs).toBe(1);
    expect(disposeSpy).not.toHaveBeenCalled();

    result.unmount();
    expect(disposeSpy).toHaveBeenCalledTimes(1);

    // Mutate the tracked observable. If the disposer leaked, autorun would
    // re-fire and `runs` would bump to 2.
    runInAction(() => {
      store.val = 1;
    });
    expect(runs).toBe(1);
  });

  it('§10.4 unmount detaches the Konva node from its stage (no react-side retention surface)', () => {
    // The original §10.4 used FinalizationRegistry to assert "react-konva
    // doesn't retain extra refs", but FR is non-deterministic in a browser
    // test runner — we can't force GC. The deterministic surface we *can*
    // assert is: after the Stage subtree unmounts, the Rect is detached
    // from its stage. If react-konva ever held an extra ref that prevented
    // disposal, getStage() would still return the Stage.
    let captured: Konva.Rect | null = null;
    const App = () => (
      <Stage width={50} height={50}>
        <Layer>
          <Rect
            ref={(r) => {
              if (r) captured = r;
            }}
            width={10}
            height={10}
          />
        </Layer>
      </Stage>
    );
    const result = render(<App />);
    expect(captured).toBeInstanceOf(Konva.Rect);
    expect(captured!.getStage()).toBeInstanceOf(Konva.Stage);
    result.unmount();
    expect(captured!.getStage()).toBeNull();
  });

  it('§10.5 use-image hook integrates with <Image> and updates on load', async () => {
    // External-library integration anchor: `use-image` is the canonical hook
    // for loading images into Konva. It returns [HTMLImageElement|undefined,
    // status]. While loading, image is undefined and status is 'loading';
    // after the <img> decodes, status flips to 'loaded'. We use an embedded
    // data URL so the test is hermetic — no network, no flake.
    const App = () => {
      const [image, status] = useImage(TINY_PNG_DATA_URL);
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

    await vi.waitFor(() => {
      expect((stage()!.findOne('Text') as Konva.Text).text()).toBe('loaded');
      expect(
        (stage()!.findOne('Image') as Konva.Image).image() instanceof
          window.Image
      ).toBe(true);
    });
  });
});
