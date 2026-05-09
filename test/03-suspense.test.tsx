// §3 — Suspense.
// Konva trees must remain consistent across suspend/resume boundaries.

import * as React from 'react';
import { describe, it, expect, vi } from 'vitest';
import Konva from 'konva';
import { Stage, Layer, Rect, Group } from '../src/ReactKonva';
import { render, act } from './helpers/render';

function makeDeferredPromise<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

describe('§3 Suspense', () => {
  it('§3.1 Stage child suspends — fallback renders, then real content; no stale Konva nodes', async () => {
    const deferred = makeDeferredPromise<string>();
    let resolved = false;
    const Suspended = () => {
      if (!resolved) {
        throw deferred.promise.then(() => {
          resolved = true;
        });
      }
      return <Rect name="real" width={10} height={10} />;
    };
    const App = () => (
      <Stage width={50} height={50}>
        <Layer>
          <React.Suspense
            fallback={<Rect name="fallback" width={10} height={10} />}
          >
            <Suspended />
          </React.Suspense>
        </Layer>
      </Stage>
    );
    const { stage } = render(<App />);
    expect(stage()!.findOne('.fallback')).toBeInstanceOf(Konva.Rect);
    expect(stage()!.findOne('.real')).toBeUndefined();

    deferred.resolve('done');
    await vi.waitFor(() => {
      expect(stage()!.findOne('.real')).toBeInstanceOf(Konva.Rect);
      expect(stage()!.findOne('.fallback')).toBeUndefined();
    });
  });

  // Prod-skip: this test resolves React.lazy promises across multiple commits.
  // React.act drains the lazy microtask chain in dev; the prod-mode `act`
  // polyfill can't (flushSync doesn't drive React's internal lazy-resolution
  // queue). The behavior is identical in both builds — only the test driver
  // can't observe it in prod.
  it.skipIf(process.env.NODE_ENV === 'production')('§3.2 re-suspend after initial commit — new content lands when its promise resolves', async () => {
    type Resolver = (mod: { default: React.ComponentType }) => void;
    const resolvers: Record<number, Resolver> = {};
    const lazies: Record<number, React.ComponentType> = {};
    const makeLazy = (k: number) =>
      React.lazy(
        () =>
          new Promise<{ default: React.ComponentType }>((res) => {
            resolvers[k] = res;
          })
      );
    lazies[1] = makeLazy(1);
    lazies[2] = makeLazy(2);

    let setKey!: (n: 1 | 2) => void;
    const App = () => {
      const [k, set] = React.useState<1 | 2>(1);
      setKey = set;
      const L = lazies[k];
      return (
        <Stage width={50} height={50}>
          <Layer>
            <React.Suspense
              fallback={<Rect name="fallback" width={10} height={10} />}
            >
              <L />
            </React.Suspense>
          </Layer>
        </Stage>
      );
    };
    const { stage } = render(<App />);
    expect(stage()!.findOne('.fallback')).toBeInstanceOf(Konva.Rect);

    await act(() => {
      resolvers[1]({
        default: () => <Rect name="real-1" width={10} height={10} />,
      });
    });
    expect(stage()!.findOne('.real-1')).toBeInstanceOf(Konva.Rect);

    act(() => setKey(2));
    await vi.waitFor(() =>
      expect(stage()!.findOne('.fallback')).toBeInstanceOf(Konva.Rect)
    );
    await act(() => {
      resolvers[2]({
        default: () => <Rect name="real-2" width={10} height={10} />,
      });
    });
    expect(stage()!.findOne('.real-2')).toBeInstanceOf(Konva.Rect);
    expect(stage()!.findOne('.fallback')).toBeUndefined();
  });

  // Prod-skip: same lazy-promise-resolution constraint as §3.2.
  it.skipIf(process.env.NODE_ENV === 'production')('§3.3 re-suspend hides previously-committed Konva nodes (visible=false), not destroys them', async () => {
    // Adapted from r3f's `'should hide suspended objects when displaying fallback'`.
    // The host config (src/ReactKonvaHostConfig.ts:212-225) implements
    // hideInstance / unhideInstance — this test verifies the reconciler
    // actually calls them when Suspense falls back to its placeholder.
    type Resolver = (mod: { default: React.ComponentType }) => void;
    const resolvers: Record<number, Resolver> = {};
    const lazies: Record<number, React.ComponentType> = {};
    const makeLazy = (k: number) =>
      React.lazy(
        () =>
          new Promise<{ default: React.ComponentType }>((res) => {
            resolvers[k] = res;
          })
      );
    lazies[1] = makeLazy(1);
    lazies[2] = makeLazy(2);

    let realRectK1: Konva.Rect | null = null;

    let setKey!: (n: 1 | 2) => void;
    const App = () => {
      const [k, set] = React.useState<1 | 2>(1);
      setKey = set;
      const L = lazies[k];
      return (
        <Stage width={50} height={50}>
          <Layer>
            <React.Suspense
              fallback={<Rect name="fallback" width={10} height={10} />}
            >
              <L />
            </React.Suspense>
          </Layer>
        </Stage>
      );
    };
    const { stage } = render(<App />);

    // Resolve k=1 — the real Rect commits and is visible.
    await act(() => {
      resolvers[1]({
        default: () => (
          <Rect
            ref={(r) => {
              if (r) realRectK1 = r;
            }}
            name="real-1"
            width={10}
            height={10}
          />
        ),
      });
    });
    expect(realRectK1).toBeInstanceOf(Konva.Rect);
    expect(realRectK1!.visible()).toBe(true);

    // Switch to k=2 — its lazy is still pending, so Suspense falls back.
    // The previously-committed real-1 must be HIDDEN (visible=false), not
    // destroyed: the same Konva.Rect instance survives so its imperative
    // state (drag handlers, animations, cached attrs) is preserved.
    act(() => setKey(2));
    await vi.waitFor(() => {
      expect(stage()!.findOne('.fallback')).toBeInstanceOf(Konva.Rect);
      expect(realRectK1!.visible()).toBe(false);
    });
    // It also must not have been destroyed; getStage() returns null on a
    // destroyed Konva.Node.
    expect(realRectK1!.getStage()).not.toBeNull();

    // Resolve k=2 — real-1 finally unmounts (it's no longer the active key);
    // real-2 commits and is visible.
    await act(() => {
      resolvers[2]({
        default: () => (
          <Rect name="real-2" width={10} height={10} />
        ),
      });
    });
    expect(stage()!.findOne('.real-2')).toBeInstanceOf(Konva.Rect);
    expect(stage()!.findOne('.real-1')).toBeUndefined();
  });

  it('§3.4 use(promise) inside a Konva subtree works', async () => {
    // React.use suspends asynchronously even on already-resolved promises that
    // it hasn't tracked yet. The synchronous render helper commits the
    // initial fallback; vi.waitFor polls for the resolved value.
    const promise = Promise.resolve('resolved-name');
    const stageRef = React.createRef<Konva.Stage>();
    const NameFromPromise = ({ p }: { p: Promise<string> }) => {
      const value = React.use(p);
      return <Rect name={value} width={10} height={10} />;
    };
    const App = () => (
      <Stage ref={stageRef} width={50} height={50}>
        <Layer>
          <React.Suspense
            fallback={<Rect name="fallback" width={10} height={10} />}
          >
            <Group>
              <NameFromPromise p={promise} />
            </Group>
          </React.Suspense>
        </Layer>
      </Stage>
    );
    render(<App />);
    await vi.waitFor(() =>
      expect(stageRef.current!.findOne('.resolved-name')).toBeInstanceOf(
        Konva.Rect
      )
    );
  });
});
