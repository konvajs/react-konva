/**
 * Based on ReactArt.js
 * Copyright (c) 2017-present Lavrenov Anton.
 * All rights reserved.
 *
 * MIT
 */
'use strict';

import React from 'react';

if (React.version.indexOf('19') === -1) {
  throw new Error(
    'react-konva version 19 is only compatible with React 19. Make sure to have the last version of react-konva and react or downgrade react-konva to version 18.'
  );
}

import Konva from 'konva/lib/Core.js';
import type { Stage as KonvaStage } from 'konva/lib/Stage.js';
import ReactFiberReconciler, {
  RootTag,
  SuspenseHydrationCallbacks,
  TransitionTracingCallbacks,
} from 'react-reconciler';
import { ConcurrentRoot } from 'react-reconciler/constants.js';
import * as HostConfig from './ReactKonvaHostConfig.js';
import { applyNodeProps, toggleStrictMode } from './makeUpdates.js';
import { useContextBridge, FiberProvider, useFiber } from 'its-fine';
import { Container } from 'konva/lib/Container.js';

/**
 * React 19 introduced a new `ReactFiberReconciler.createContainer` signature
 * with more error handling options [1]. The DefinitelyTyped types are also
 * out of date because of this [2].
 *
 * 1. https://github.com/facebook/react/commit/a0537160771bafae90c6fd3154eeead2f2c903e7
 * 2. https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/react-reconciler/index.d.ts#L920
 */
type NewCreateContainer = (
  containerInfo: Container,
  tag: RootTag,
  hydrationCallbacks: null | SuspenseHydrationCallbacks<any>,
  isStrictMode: boolean,
  concurrentUpdatesByDefaultOverride: null | boolean,
  identifierPrefix: string,
  onUncaughtError: (error: Error) => void,
  onCaughtError: (error: Error) => void,
  onRecoverableError: (error: Error) => void,
  transitionCallbacks: null | TransitionTracingCallbacks
) => ReactFiberReconciler.FiberRoot;

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
  const isMounted = React.useRef(false);

  const _setRef = (stage) => {
    const { forwardedRef } = props;
    if (!forwardedRef) {
      return;
    }
    if (typeof forwardedRef === 'function') {
      forwardedRef(stage);
    } else {
      forwardedRef.current = stage;
    }
  };

  const isStrictMode = useIsReactStrictMode();

  React.useLayoutEffect(() => {
    // is we are in strict mode, we need to ignore the second full render
    // instead do nothing and just return clean function
    if (isMounted.current && isStrictMode) {
      return () => {
        isMounted.current = false;
        _setRef(null);
        KonvaRenderer.updateContainer(null, fiberRef.current, null);
        stage.current.destroy();
      };
    }
    isMounted.current = true;
    stage.current = new Konva.Stage({
      width: props.width,
      height: props.height,
      container: container.current,
    });

    _setRef(stage.current);

    // @ts-ignore
    fiberRef.current = (KonvaRenderer.createContainer as NewCreateContainer)(
      stage.current,
      ConcurrentRoot,
      null,
      false,
      null,
      '',
      console.error,
      console.error,
      console.error,
      null
    );

    KonvaRenderer.updateContainer(
      React.createElement(Bridge, {}, props.children),
      fiberRef.current,
      null,
      () => {}
    );

    return () => {
      // inside React strict mode, we need to ignore cleanup, because it will mess with refs
      if (isStrictMode) {
        return;
      }
      _setRef(null);
      KonvaRenderer.updateContainer(null, fiberRef.current, null);
      stage.current.destroy();
    };
  }, []);

  React.useLayoutEffect(() => {
    _setRef(stage.current);
    applyNodeProps(stage.current, props, oldProps);
    KonvaRenderer.updateContainer(
      React.createElement(Bridge, {}, props.children),
      fiberRef.current,
      null
    );
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

KonvaRenderer.injectIntoDevTools({
  // @ts-ignore
  findHostInstanceByFiber: () => null,
  bundleType: process.env.NODE_ENV !== 'production' ? 1 : 0,
  version: React.version,
  rendererPackageName: 'react-konva',
});

// Add this interface
interface StageProps extends React.RefAttributes<KonvaStage> {
  children?: React.ReactNode;
  width?: number;
  height?: number;
  name?: string;
  [key: string]: any;
}

// Update Stage component declaration
export const Stage: React.FC<StageProps> = React.forwardRef((props, ref) => {
  return React.createElement(
    FiberProvider,
    {},
    React.createElement(StageWrap, { ...props, forwardedRef: ref })
  );
});

export const useStrictMode = toggleStrictMode;

// export useContextBridge from its-fine for reuse in react-konva-utils
// so react-konva-utils don't use its own version of its-fine (it is possible on pnpm)
export { useContextBridge };
