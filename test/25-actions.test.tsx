// §25 — Actions and optimistic state inside a Stage.
// `useActionState` runs its action inside a transition owned by the bundled
// react-reconciler and then hands that transition object back to the host
// react-dom through `ReactSharedInternals.S`. Both halves have to agree on its
// shape, so these tests fail as soon as the bundled reconciler and the peer
// react-dom drift apart.
//
// Transitions are not sync lanes, so the prod-mode `act` polyfill cannot drain
// them with `flushSync`; the assertions poll with `vi.waitFor`, the way the
// Suspense tests in §3 do.

import * as React from 'react';
import { describe, it, expect, vi } from 'vitest';
import Konva from 'konva';
import { Stage, Layer, Rect } from '../src/ReactKonva';
import { render, act } from './helpers/render';

const fillOf = (stage?: Konva.Stage) =>
  (stage!.findOne('Rect') as Konva.Rect).fill();

describe('§25 actions and optimistic state', () => {
  it('§25.1 useActionState — an async action inside a transition reaches Konva', async () => {
    let submit: (next: string) => void = () => {};
    const Fill = () => {
      const [fill, action] = React.useActionState(
        async (_previous: string, next: string) => next,
        'red'
      );
      submit = action;
      return <Rect width={10} height={10} fill={fill} />;
    };

    const { stage } = render(
      <Stage width={50} height={50}>
        <Layer>
          <Fill />
        </Layer>
      </Stage>
    );

    await act(() => React.startTransition(() => submit('blue')));
    await vi.waitFor(() => expect(fillOf(stage())).toBe('blue'));
  });

  it('§25.2 useActionState — a synchronous action reaches Konva', async () => {
    let submit: (next: string) => void = () => {};
    const Fill = () => {
      const [fill, action] = React.useActionState(
        (_previous: string, next: string) => next,
        'red'
      );
      submit = action;
      return <Rect width={10} height={10} fill={fill} />;
    };

    const { stage } = render(
      <Stage width={50} height={50}>
        <Layer>
          <Fill />
        </Layer>
      </Stage>
    );

    expect(fillOf(stage())).toBe('red');
    await act(() => React.startTransition(() => submit('green')));
    await vi.waitFor(() => expect(fillOf(stage())).toBe('green'));
  });

  it('§25.3 useOptimistic — the optimistic fill shows while the action runs', async () => {
    let submit: (next: string) => void = () => {};
    let release: (() => void) | null = null;

    const Fill = () => {
      const [fill, setFill] = React.useState('red');
      const [optimisticFill, setOptimisticFill] = React.useOptimistic(fill);
      submit = (next) => {
        React.startTransition(async () => {
          setOptimisticFill(next);
          await new Promise<void>((resolve) => {
            release = resolve;
          });
          React.startTransition(() => setFill(next));
        });
      };
      return <Rect width={10} height={10} fill={optimisticFill} />;
    };

    const { stage } = render(
      <Stage width={50} height={50}>
        <Layer>
          <Fill />
        </Layer>
      </Stage>
    );

    await act(() => submit('green'));
    await vi.waitFor(() => expect(fillOf(stage())).toBe('green'));

    await act(() => release!());
    await vi.waitFor(() => expect(fillOf(stage())).toBe('green'));
  });
});
