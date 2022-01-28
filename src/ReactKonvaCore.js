/**
 * Based on ReactArt.js
 * Copyright (c) 2017-present Lavrenov Anton.
 * All rights reserved.
 *
 * MIT
 */
'use strict';

import React from 'react';
import Konva from 'konva/lib/Core';
import ReactFiberReconciler from 'react-reconciler';
import * as HostConfig from './ReactKonvaHostConfig';
import { applyNodeProps, toggleStrictMode } from './makeUpdates';

function usePrevious(value) {
  const ref = React.useRef();
  React.useLayoutEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

const StageWrap = (props) => {
  const container = React.useRef();
  const stage = React.useRef();
  const fiberRef = React.useRef();

  const oldProps = usePrevious(props);

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

    fiberRef.current = KonvaRenderer.createContainer(stage.current);
    KonvaRenderer.updateContainer(props.children, fiberRef.current);

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
    KonvaRenderer.updateContainer(props.children, fiberRef.current, null);
  });

  return (
    <div
      ref={container}
      accessKey={props.accessKey}
      className={props.className}
      role={props.role}
      style={props.style}
      tabIndex={props.tabIndex}
      title={props.title}
    />
  );
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

export const KonvaRenderer = ReactFiberReconciler(HostConfig);

KonvaRenderer.injectIntoDevTools({
  findHostInstanceByFiber: () => null,
  bundleType: process.env.NODE_ENV !== 'production' ? 1 : 0,
  version: React.version,
  rendererPackageName: 'react-konva',
});

export const Stage = React.forwardRef((props, ref) => {
  return <StageWrap {...props} forwardedRef={ref} />;
});

export const useStrictMode = toggleStrictMode;
