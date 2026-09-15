/**
 * Based on ReactArt.js
 * Copyright (c) 2017-present Lavrenov Anton.
 * All rights reserved.
 *
 * MIT
 */
'use strict';

import React from 'react';
import { useFormStatus } from 'react-dom';

const [reactMajor, reactMinor] = React.version.split('.').map(Number);

if (reactMajor !== 19 || reactMinor < 3) {
  throw new Error(
    'react-konva requires React 19.3 or later within React 19. ' +
      'Install matching versions of react and react-dom. ' +
      'For React 19.2, use react-konva 19.2. For React 18, use react-konva 18.',
  );
}

import Konva from 'konva/lib/Core.js';
import type { Stage as KonvaStage } from 'konva/lib/Stage.js';
import ReactFiberReconciler from 'react-reconciler';
import { ConcurrentRoot } from 'react-reconciler/constants.js';
import * as HostConfig from './ReactKonvaHostConfig.js';
import { getEventBatch, addPendingUnmount, prepareUnmounts } from './EventBatch.js';
import {
  applyNodeProps,
  toggleStrictMode,
  EVENTS_NAMESPACE,
} from './makeUpdates.js';
import { useContextBridge, useFiber, traverseFiber, FiberProvider } from 'its-fine';

function usePrevious(value) {
  const ref = React.useRef({});
  React.useLayoutEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

function SuspendCanvas({ promise }: { promise: Promise<void> }): never {
  throw promise;
}

const StageWrap = (props) => {
  const container = React.useRef(null);
  const stage = React.useRef<any>(null);
  const fiberRef = React.useRef(null);
  const children = React.useRef<React.ReactNode>(null);
  const suspension = React.useRef<{
    promise: Promise<void>;
    resolve: () => void;
  } | null>(null);
  // DOM and Konva reconcilers have separate useId counters.
  const identifierPrefix = React.useId();
  const formStatus = useFormStatus();

  const oldProps = usePrevious(props);
  const Bridge = useContextBridge();
  const fiber = useFiber();
  const isStrictMode = !!traverseFiber(
    fiber,
    true,
    (node) => node.type === React.StrictMode,
  );
  const effectsDisconnected = React.useRef(false);
  const isUnmounting = React.useRef(false);
  const cancelUnmount = React.useRef<(() => void) | null>(null);

  // Insertion effects stay mounted during hiding and StrictMode replay.
  // Activity has already disconnected layout and passive effects when hidden.
  // Its remaining insertion cleanups must still run inside a DOM commit.
  React.useInsertionEffect(() => {
    isUnmounting.current = false;
    return () => {
      isUnmounting.current = true;
      if (effectsDisconnected.current && stage.current) destroyStage();
    };
  }, []);

  const destroyStage = () => {
    cancelUnmount.current?.();
    cancelUnmount.current = null;
    prepareUnmounts();
    // Discard queued child work before destroying the Stage, including updates
    // from external stores whose objects are no longer alive.
    KonvaRenderer.flushSyncFromReconciler(() => {
      KonvaRenderer.updateContainer(null, fiberRef.current, null);
    });
    stage.current?.destroy();
    stage.current?.off(EVENTS_NAMESPACE);
    stage.current = null;
    suspension.current?.resolve();
    suspension.current = null;
  };

  const setCanvasVisibility = (mode: 'visible' | 'suspended' | 'hidden') => {
    if (mode === 'suspended') {
      if (!suspension.current) {
        let resolve!: () => void;
        const promise = new Promise<void>((done) => {
          resolve = done;
        });
        suspension.current = { promise, resolve };
      }
    } else {
      suspension.current?.resolve();
      suspension.current = null;
    }
    KonvaRenderer.updateContainer(
      React.createElement(React.Activity, {
        mode: mode === 'hidden' ? 'hidden' : 'visible',
        children: React.createElement(
          React.Suspense,
          { fallback: null },
          children.current,
          suspension.current &&
            React.createElement(SuspendCanvas, {
              promise: suspension.current.promise,
            }),
        ),
      }),
      fiberRef.current,
      null,
    );
    prepareUnmounts();
    // Parent layout effects must see the committed canvas nodes and refs.
    KonvaRenderer.flushSyncWork();
  };

  React.useLayoutEffect(() => {
    cancelUnmount.current?.();
    cancelUnmount.current = null;
    // Reconnecting layout effects reuses the existing Stage.
    if (!stage.current) {
      stage.current = new Konva.Stage({
        width: props.width,
        height: props.height,
        container: container.current,
      });
      fiberRef.current = KonvaRenderer.createContainer(
        stage.current,
        ConcurrentRoot,
        null,
        isStrictMode,
        null,
        identifierPrefix,
        console.error,
        console.error,
        console.error,
        null,
      );
    }

    return () => {
      if (!isUnmounting.current) {
        // If this hidden Stage is deleted, discard queued child work before
        // another root or the scheduler flushes it.
        const unmount = () => {
          if (!isUnmounting.current) return;
          cancelUnmount.current?.();
          cancelUnmount.current = null;
          KonvaRenderer.updateContainer(null, fiberRef.current, null);
        };
        cancelUnmount.current = addPendingUnmount(unmount);
        // Suspense disconnects layout effects but keeps passive effects.
        setCanvasVisibility('suspended');
      } else {
        destroyStage();
      }
    };
  }, []);

  React.useEffect(() => {
    effectsDisconnected.current = false;
    return () => {
      effectsDisconnected.current = true;
      // Activity and StrictMode also disconnect the DOM passive effects.
      if (!stage.current) return;
      if (isUnmounting.current) destroyStage();
      else setCanvasVisibility('hidden');
    };
  }, []);

  React.useLayoutEffect(() => {
    // Older Konva versions use the normal asynchronous React scheduler.
    if (typeof stage.current.eventBatchFunc === 'function') {
      stage.current.eventBatchFunc(getEventBatch(props.eventBatchFunc));
    }
  }, [props.eventBatchFunc]);

  React.useImperativeHandle(props.forwardedRef, () => stage.current, []);

  React.useLayoutEffect(() => {
    applyNodeProps(stage.current, props, oldProps);

    // updateContainer schedules sync-lane work; with async scheduleMicrotask
    // the work is queued, so flushSyncWork() drains it inline here so that
    // a parent useLayoutEffect can read Konva nodes added by subscribing
    // children. (Lighter than flushSyncFromReconciler — no callback wrapper.)
    children.current = React.createElement(
      HostConfig.HostTransitionContext.Provider,
      { value: formStatus },
      React.createElement(Bridge, {}, props.children),
    );
    setCanvasVisibility('visible');
  });

  return React.createElement('div', {
    ref: container,
    id: props.id,
    accessKey: props.accessKey,
    className: props.className,
    role: props.role,
    style: props.style,
    tabIndex: props.tabIndex,
    title: props.title,
  });
};

export const Layer = 'Layer';
export const FastLayer = 'FastLayer';
export const Group = 'Group';
export const Label = 'Label';
export const Rect = 'Rect';
export const Circle = 'Circle';
export const Ellipse = 'Ellipse';
export const Wedge = 'Wedge';
export const Line = 'Line';
export const Sprite = 'Sprite';
export const Image = 'Image';
export const Text = 'Text';
export const TextPath = 'TextPath';
export const Star = 'Star';
export const Ring = 'Ring';
export const Arc = 'Arc';
export const Tag = 'Tag';
export const Path = 'Path';
export const RegularPolygon = 'RegularPolygon';
export const Arrow = 'Arrow';
export const Shape = 'Shape';
export const Transformer = 'Transformer';

export const version = '{VERSION}';

const rendererConfig = {
  ...HostConfig,
  rendererVersion: version,
  rendererPackageName: 'react-konva',
};

// @ts-ignore The published types still describe react-reconciler 0.33.
export const KonvaRenderer = ReactFiberReconciler(rendererConfig);

// @ts-expect-error Metadata moved into the host config in react-reconciler 0.34.
KonvaRenderer.injectIntoDevTools();

interface StageProps extends React.RefAttributes<KonvaStage> {
  children?: React.ReactNode;
  width?: number;
  height?: number;
  name?: string;
  eventBatchFunc?: (callback: () => void) => void;
  [key: string]: any;
}

export const Stage: React.FC<StageProps> = React.forwardRef((props, ref) => {
  return React.createElement(
    FiberProvider,
    {},
    React.createElement(StageWrap, { ...props, forwardedRef: ref }),
  );
});

export const useStrictMode = toggleStrictMode;

// export useContextBridge from its-fine for reuse in react-konva-utils
// so react-konva-utils don't use its own version of its-fine (it is possible on pnpm)
export { useContextBridge };
