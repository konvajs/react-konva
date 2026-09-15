// §25 — Actions and optimistic state inside a Stage.
// `useActionState` runs its action inside a transition owned by the bundled
// react-reconciler and then hands that transition object back to the host
// react-dom through `ReactSharedInternals.S`. Both halves have to agree on its
// shape. The async action guards against the React 19.3 / reconciler 0.33
// mismatch, which left transition.types undefined.
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
  it.each([false, true])('§25.1 useActionState — a native click completes an async action (StrictMode=%s)', async (strict) => {
    let release!: () => void;
    const rect = React.createRef<Konva.Rect>();
    const Fill = () => {
      const [fill, submit, pending] = React.useActionState(
        async (_previous: string, next: string) => {
          await new Promise<void>((resolve) => {
            release = resolve;
          });
          return next;
        },
        'red'
      );
      return (
        <Rect
          ref={rect}
          width={50}
          height={50}
          fill={fill}
          name={String(pending)}
          onClick={() => React.startTransition(() => submit('blue'))}
        />
      );
    };

    const ui = (
      <Stage width={100} height={100}>
        <Layer>
          <Fill />
        </Layer>
      </Stage>
    );
    const { stage } = render(strict ? <React.StrictMode>{ui}</React.StrictMode> : ui);
    const canvas = stage()!;
    canvas.draw();

    // Dispatch through Konva's native event batch, without an outer act scope.
    canvas.simulateMouseDown({ x: 20, y: 20 });
    canvas.simulateMouseUp({ x: 20, y: 20 });
    await vi.waitFor(() => expect(rect.current!.name()).toBe('true'));
    expect(rect.current!.fill()).toBe('red');

    await act(() => release());
    await vi.waitFor(() => {
      expect(rect.current!.fill()).toBe('blue');
      expect(rect.current!.name()).toBe('false');
    });
  });

  it('§25.2 useActionState — a synchronous action reaches Konva', async () => {
    let submit!: (next: string) => void;
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

  it('§25.3 useOptimistic — the optimistic fill settles to the saved fill', async () => {
    let submit!: (next: string) => void;
    let release!: (savedFill: string) => void;

    const Fill = () => {
      const [fill, setFill] = React.useState('red');
      const [optimisticFill, setOptimisticFill] = React.useOptimistic(fill);
      submit = (next) => {
        React.startTransition(async () => {
          setOptimisticFill(next);
          const savedFill = await new Promise<string>((resolve) => {
            release = resolve;
          });
          React.startTransition(() => setFill(savedFill));
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

    expect(fillOf(stage())).toBe('red');
    await act(() => submit('green'));
    await vi.waitFor(() => expect(fillOf(stage())).toBe('green'));

    await act(() => release('blue'));
    await vi.waitFor(() => expect(fillOf(stage())).toBe('blue'));
  });
});
