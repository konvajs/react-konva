/**
 * Based on ReactArt.js
 * Copyright (c) 2017-present Lavrenov Anton.
 * All rights reserved.
 *
 * MIT
 */
'use strict';

import React from 'react';

const [reactMajor, reactMinor] = React.version.split('.').map(Number);

if (reactMajor !== 19 || reactMinor < 3) {
  throw new Error(
    'react-konva version 19.3 is only compatible with React 19.3 and newer. The bundled react-reconciler shares internal state with react-dom, so the two have to be the same minor release. Make sure to have the last version of react-konva and react, or downgrade react-konva to version 19.2 for React 19.2 and to version 18 for React 18.',
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
import { useContextBridge, FiberProvider } from 'its-fine';

function usePrevious(value) {
  const ref = React.useRef({});
  React.useLayoutEffect(() => {
    ref.current = value;
  });
  React.useLayoutEffect(() => {
    return () => {
      // when using suspense it is possible that stage is unmounted
      // but React still keep component ref
      // in that case we need to manually flush props
      // we have a special test for that
      ref.current = {};
    };
  }, []);
  return ref.current;
}

const useIsReactStrictMode = () => {
  const memoCount = React.useRef(0);
  // in strict mode, memo will be called twice
  React.useMemo(() => {
    memoCount.current++;
  }, []);
  return memoCount.current > 1;
};

const StageWrap = (props) => {
  const container = React.useRef(null);
  const stage = React.useRef<any>(null);
  const fiberRef = React.useRef(null);

  const oldProps = usePrevious(props);
  const Bridge = useContextBridge();
  const pendingDestroy = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const isUnmounting = React.useRef(false);
  const cancelUnmount = React.useRef<(() => void) | null>(null);

  // Insertion effects stay mounted during StrictMode's layout-effect replay.
  // Only mark deletion here; renderer updates belong in layout cleanup.
  React.useInsertionEffect(() => {
    isUnmounting.current = false;
    return () => {
      isUnmounting.current = true;
    };
  }, []);

  const isStrictMode = useIsReactStrictMode();

  const destroyStage = () => {
    cancelUnmount.current?.();
    cancelUnmount.current = null;
    prepareUnmounts();
    // CRITICAL: flushSyncFromReconciler is required here to ensure pending work
    // (e.g. stale MobX updates on child components) is flushed synchronously
    // before the tree is torn down. Without it, unmounting a Stage can leave
    // pending Konva work that runs after the stage is already destroyed.
    KonvaRenderer.flushSyncFromReconciler(() => {
      KonvaRenderer.updateContainer(null, fiberRef.current, null);
    });
    stage.current?.destroy();
    stage.current?.off(EVENTS_NAMESPACE);
    stage.current = null;
  };

  React.useLayoutEffect(() => {
    cancelUnmount.current?.();
    cancelUnmount.current = null;
    // Cancel any pending destruction (happens during re-ordering in strict mode)
    if (pendingDestroy.current) {
      clearTimeout(pendingDestroy.current);
      pendingDestroy.current = null;
    }

    // If stage already exists (re-ordering scenario), reuse it
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
        false,
        null,
        '',
        console.error,
        console.error,
        console.error,
        null,
      );
    }

    return () => {
      if (isStrictMode) {
        // Queue real removal before pending child work can render. Queuing it
        // during replay lets a sibling Stage's flush discard this root's state.
        const unmount = () => {
          if (!isUnmounting.current) return;
          cancelUnmount.current?.();
          cancelUnmount.current = null;
          KonvaRenderer.updateContainer(null, fiberRef.current, null);
        };
        cancelUnmount.current = addPendingUnmount(unmount);
        unmount();
        // Keep the Stage available for that remount.
        pendingDestroy.current = setTimeout(destroyStage, 0);
      } else {
        destroyStage();
      }
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
    KonvaRenderer.updateContainer(
      React.createElement(Bridge, {}, props.children),
      fiberRef.current,
      null,
    );
    prepareUnmounts();
    KonvaRenderer.flushSyncWork();
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

// @ts-ignore
export const KonvaRenderer = ReactFiberReconciler(HostConfig);

// we should inject into dev tools, but it is not working with React 19.2
// with error "Invalid argument not valid semver ('' received)"
// KonvaRenderer.injectIntoDevTools({
//   // @ts-ignore
//   findHostInstanceByFiber: () => null,
//   bundleType: 0,
//   version: React.version,
//   rendererPackageName: 'react-konva',
//   reconcilerVersion: '19.2.0',
// });

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
