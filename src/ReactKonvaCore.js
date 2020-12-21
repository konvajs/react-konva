/**
 * Based on ReactArt.js
 * Copyright (c) 2017-present Lavrenov Anton.
 * All rights reserved.
 *
 * MIT
 */
'use strict';

const React = require('react');
const Konva = require('konva/lib/Core');
const ReactFiberReconciler = require('react-reconciler');
const HostConfig = require('./ReactKonvaHostConfig');
const { applyNodeProps, toggleStrictMode } = require('./makeUpdates');

// export for testing
// const REACT_VERSION = '16.8.3';
// const __matchRectVersion = React.version === REACT_VERSION;
// skip version testing for now
module.exports.__matchRectVersion = true;

// That warning is useful, but I am not sure we really need it
// if (!__matchRectVersion) {
//   console.warn(
//     `Version mismatch detected for react-konva and react. react-konva expects to have react version ${REACT_VERSION}, but it has version ${
//       React.version
//     }. Make sure versions are matched, otherwise, react-konva work is not guaranteed. For releases information take a look here: https://github.com/konvajs/react-konva/releases`
//   );
// }

class Stage extends React.Component {
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

module.exports.Layer = 'Layer';
module.exports.FastLayer = 'FastLayer';
module.exports.Group = 'Group';
module.exports.Label = 'Label';
module.exports.Rect = 'Rect';
module.exports.Circle = 'Circle';
module.exports.Ellipse = 'Ellipse';
module.exports.Wedge = 'Wedge';
module.exports.Line = 'Line';
module.exports.Sprite = 'Sprite';
module.exports.Image = 'Image';
module.exports.Text = 'Text';
module.exports.TextPath = 'TextPath';
module.exports.Star = 'Star';
module.exports.Ring = 'Ring';
module.exports.Arc = 'Arc';
module.exports.Tag = 'Tag';
module.exports.Path = 'Path';
module.exports.RegularPolygon = 'RegularPolygon';
module.exports.Arrow = 'Arrow';
module.exports.Shape = 'Shape';
module.exports.Transformer = 'Transformer';

const KonvaRenderer = ReactFiberReconciler(HostConfig);

KonvaRenderer.injectIntoDevTools({
  findHostInstanceByFiber: () => null,
  bundleType: process.env.NODE_ENV !== 'production' ? 1 : 0,
  version: React.version,
  rendererPackageName: 'react-konva',
});

const StageWrap = React.forwardRef((props, ref) => {
  return <Stage {...props} forwardedRef={ref} />;
});

module.exports.Stage = StageWrap;
module.exports.useStrictMode = toggleStrictMode;
