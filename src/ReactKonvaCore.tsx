/**
 * Based on ReactArt.js
 * Copyright (c) 2017-present Lavrenov Anton.
 * All rights reserved.
 *
 * MIT
 */
'use strict';

import React from 'react';
import Konva from 'konva/lib/Core.js';
import ReactFiberReconciler, {
  RootTag,
  SuspenseHydrationCallbacks,
  TransitionTracingCallbacks,
} from 'react-reconciler';
import { LegacyRoot } from 'react-reconciler/constants.js';
import * as HostConfig from './ReactKonvaHostConfig.js';
import { applyNodeProps, toggleStrictMode } from './makeUpdates.js';
import { useContextBridge, FiberProvider } from 'its-fine';
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

const StageWrap = (props) => {
  const container = React.useRef();
  const stage = React.useRef<any>();
  const fiberRef = React.useRef();

  const oldProps = usePrevious(props);
  const Bridge = useContextBridge();

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

  React.useLayoutEffect(() => {
    stage.current = new Konva.Stage({
      width: props.width,
      height: props.height,
      container: container.current,
    });

    _setRef(stage.current);

    // @ts-ignore 
    fiberRef.current = (KonvaRenderer.createContainer as NewCreateContainer)(
      stage.current,
      LegacyRoot,
      null,
      null,
      undefined,
      undefined,
      console.error, 
      console.error,
      console.error,
      null,
    );
    KonvaRenderer.updateContainer(
      React.createElement(Bridge, {}, props.children),
      fiberRef.current
    );

    return () => {
      if (!Konva.isBrowser) {
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

// @ts-ignore
export const KonvaRenderer = ReactFiberReconciler(HostConfig);

KonvaRenderer.injectIntoDevTools({
  // @ts-ignore
  findHostInstanceByFiber: () => null,
  bundleType: process.env.NODE_ENV !== 'production' ? 1 : 0,
  version: React.version,
  rendererPackageName: 'react-konva',
});

export const Stage = React.forwardRef((props, ref) => {
  return React.createElement(
    FiberProvider,
    {},
    React.createElement(StageWrap, { ...props, forwardedRef: ref })
  );
});

export const useStrictMode = toggleStrictMode;
