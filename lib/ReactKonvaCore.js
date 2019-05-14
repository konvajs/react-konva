/**
 * Based on ReactArt.js
 * Copyright (c) 2017-present Lavrenov Anton.
 * All rights reserved.
 *
 * MIT
 */
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var React = require('react');
var Konva = require('konva/lib/Core');
var ReactFiberReconciler = require('react-reconciler');
var ReactDOMComponentTree = require('./ReactDOMComponentTree');
var HostConfig = require('./ReactKonvaHostConfig');

var _require = require('./makeUpdates'),
    applyNodeProps = _require.applyNodeProps,
    toggleStrictMode = _require.toggleStrictMode;

// export for testing
// const REACT_VERSION = '16.8.3';
// const __matchRectVersion = React.version === REACT_VERSION;
// skip version testing for now


var __matchRectVersion = true;

// That warning is useful, but I am not sure we really need it
// if (!__matchRectVersion) {
//   console.warn(
//     `Version mismatch detected for react-konva and react. react-konva expects to have react version ${REACT_VERSION}, but it has version ${
//       React.version
//     }. Make sure versions are matched, otherwise, react-konva work is not guaranteed. For releases information take a look here: https://github.com/konvajs/react-konva/releases`
//   );
// }

var Stage = function (_React$Component) {
  _inherits(Stage, _React$Component);

  function Stage() {
    _classCallCheck(this, Stage);

    return _possibleConstructorReturn(this, _React$Component.apply(this, arguments));
  }

  Stage.prototype.componentDidMount = function componentDidMount() {
    if (!Konva.isBrowser) {
      return;
    }
    this._stage = new Konva.Stage({
      width: this.props.width,
      height: this.props.height,
      container: this._tagRef
    });

    this._setRef(this._stage);

    applyNodeProps(this._stage, this.props);

    this._mountNode = KonvaRenderer.createContainer(this._stage);
    KonvaRenderer.updateContainer(this.props.children, this._mountNode, this);
  };

  Stage.prototype._setRef = function _setRef(value) {
    var forwardedRef = this.props.forwardedRef;

    if (!forwardedRef) {
      return;
    }
    if (typeof forwardedRef === 'function') {
      forwardedRef(value);
    } else {
      forwardedRef.current = value;
    }
  };

  Stage.prototype.componentDidUpdate = function componentDidUpdate(prevProps) {
    if (!Konva.isBrowser) {
      return;
    }
    this._setRef(this._stage);
    applyNodeProps(this._stage, this.props, prevProps);

    KonvaRenderer.updateContainer(this.props.children, this._mountNode, this);
  };

  Stage.prototype.componentWillUnmount = function componentWillUnmount() {
    if (!Konva.isBrowser) {
      return;
    }
    this._setRef(null);
    KonvaRenderer.updateContainer(null, this._mountNode, this);
    this._stage.destroy();
  };

  Stage.prototype.getStage = function getStage() {
    return this._stage;
  };

  Stage.prototype.render = function render() {
    var _this2 = this;

    var props = this.props;

    return React.createElement('div', {
      ref: function ref(_ref) {
        return _this2._tagRef = _ref;
      },
      accessKey: props.accessKey,
      className: props.className,
      role: props.role,
      style: props.style,
      tabIndex: props.tabIndex,
      title: props.title
    });
  };

  return Stage;
}(React.Component);

var KONVA_NODES = ['Layer', 'FastLayer', 'Group', 'Label', 'Rect', 'Circle', 'Ellipse', 'Wedge', 'Line', 'Sprite', 'Image', 'Text', 'TextPath', 'Star', 'Ring', 'Arc', 'Tag', 'Path', 'RegularPolygon', 'Arrow', 'Shape', 'Transformer'];

var TYPES = {};

KONVA_NODES.forEach(function (nodeName) {
  TYPES[nodeName] = nodeName;
});

var KonvaRenderer = ReactFiberReconciler(HostConfig);

KonvaRenderer.injectIntoDevTools({
  findFiberByHostInstance: ReactDOMComponentTree.getClosestInstanceFromNode,
  bundleType: process.env.NODE_ENV !== 'production' ? 1 : 0,
  version: React.version,
  rendererPackageName: 'react-konva',
  getInspectorDataForViewTag: function getInspectorDataForViewTag() {
    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    console.log(args);
  }
});

/** API */

var StageWrap = React.forwardRef(function (props, ref) {
  return React.createElement(Stage, _extends({}, props, { forwardedRef: ref }));
});

module.exports = _extends({}, TYPES, {
  __matchRectVersion: __matchRectVersion,
  Stage: StageWrap,
  useStrictMode: toggleStrictMode
});