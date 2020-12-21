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

// export for testing
// const REACT_VERSION = '16.8.3';
// const __matchRectVersion = React.version === REACT_VERSION;
// skip version testing for now
export const __matchRectVersion = true;

// That warning is useful, but I am not sure we really need it
// if (!__matchRectVersion) {
//   console.warn(
//     `Version mismatch detected for react-konva and react. react-konva expects to have react version ${REACT_VERSION}, but it has version ${
//       React.version
//     }. Make sure versions are matched, otherwise, react-konva work is not guaranteed. For releases information take a look here: https://github.com/konvajs/react-konva/releases`
//   );
// }

class StageWrap extends React.Component {
  componentDidMount() {
    if (!Konva.isBrowser) {
      return;
    }
    this._stage = new Konva.Stage({
      width: this.props.width,
      height: this.props.height,
      container: this._tagRef,
    });

    this._setRef(this._stage);

    applyNodeProps(this._stage, this.props);

    this._mountNode = KonvaRenderer.createContainer(this._stage);
    KonvaRenderer.updateContainer(this.props.children, this._mountNode, this);
  }

  _setRef(value) {
    const { forwardedRef } = this.props;
    if (!forwardedRef) {
      return;
    }
    if (typeof forwardedRef === 'function') {
      forwardedRef(value);
    } else {
      forwardedRef.current = value;
    }
  }

  componentDidUpdate(prevProps) {
    if (!Konva.isBrowser) {
      return;
    }
    this._setRef(this._stage);
    applyNodeProps(this._stage, this.props, prevProps);

    KonvaRenderer.updateContainer(this.props.children, this._mountNode, this);
  }

  componentWillUnmount() {
    if (!Konva.isBrowser) {
      return;
    }
    this._setRef(null);
    KonvaRenderer.updateContainer(null, this._mountNode, this);
    this._stage.destroy();
  }

  getStage() {
    return this._stage;
  }

  render() {
    const props = this.props;

    return (
      <div
        ref={(ref) => (this._tagRef = ref)}
        accessKey={props.accessKey}
        className={props.className}
        role={props.role}
        style={props.style}
        tabIndex={props.tabIndex}
        title={props.title}
      />
    );
  }
}

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

const KonvaRenderer = ReactFiberReconciler(HostConfig);

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
