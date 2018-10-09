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

var invariant = require('fbjs/lib/invariant');
var emptyObject = require('fbjs/lib/emptyObject');
var React = require('react');
var Konva = require('konva');
var ReactFiberReconciler = require('react-reconciler');
var ReactDOMFrameScheduling = require('./ReactDOMFrameScheduling');
var ReactDOMComponentTree = require('./ReactDOMComponentTree');

var Component = React.Component;


var EVENTS_NAMESPACE = '.react-konva-event';

var propsToSkip = { children: true, ref: true, key: true, style: true };

var idWarningShowed = false;
var zIndexWarningShowed = false;

function applyNodeProps(instance, props) {
  var oldProps = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  if (!idWarningShowed && 'id' in props) {
    var message = 'ReactKonva: You are using "id" attribute for a Konva node. In some very rare cases it may produce bugs. Currently we recommend not to use it and use "name" attribute instead.\nYou are using id = "' + props.id + '".\nFor me info see: https://github.com/konvajs/react-konva/issues/119';
    console.warn(message);
    idWarningShowed = true;
  }

  if (!zIndexWarningShowed && 'zIndex' in props) {
    var _message = 'ReactKonva: You are using "zIndex" attribute for a Konva node.\nreact-konva may get confused with ordering. Just define correct order of elements in your render function of a component.\nFor me info see: https://github.com/konvajs/react-konva/issues/194\n';
    console.warn(_message);
    zIndexWarningShowed = true;
  }

  var updatedProps = {};
  var hasUpdates = false;
  for (var key in oldProps) {
    if (propsToSkip[key]) {
      continue;
    }
    var isEvent = key.slice(0, 2) === 'on';
    var propChanged = oldProps[key] !== props[key];
    if (isEvent && propChanged) {
      var eventName = key.substr(2).toLowerCase();
      if (eventName.substr(0, 7) === 'content') {
        eventName = 'content' + eventName.substr(7, 1).toUpperCase() + eventName.substr(8);
      }
      instance.off(eventName, oldProps[key]);
    }
    var toRemove = !props.hasOwnProperty(key);
    if (toRemove) {
      instance.setAttr(key, undefined);
    }
  }
  for (var key in props) {
    if (propsToSkip[key]) {
      continue;
    }
    var isEvent = key.slice(0, 2) === 'on';
    var toAdd = oldProps[key] !== props[key];
    if (isEvent && toAdd) {
      var eventName = key.substr(2).toLowerCase();
      if (eventName.substr(0, 7) === 'content') {
        eventName = 'content' + eventName.substr(7, 1).toUpperCase() + eventName.substr(8);
      }
      if (props[key]) {
        instance.on(eventName + EVENTS_NAMESPACE, props[key]);
      }
    }
    if (!isEvent && (props[key] !== oldProps[key] || props[key] !== instance.getAttr(key))) {
      hasUpdates = true;
      updatedProps[key] = props[key];
    }
  }

  if (hasUpdates) {
    instance.setAttrs(updatedProps);
    updatePicture(instance);
  }
}

function updatePicture(node) {
  var drawingNode = node.getLayer() || node.getStage();
  drawingNode && drawingNode.batchDraw();
}

var Stage = function (_Component) {
  _inherits(Stage, _Component);

  function Stage() {
    _classCallCheck(this, Stage);

    return _possibleConstructorReturn(this, _Component.apply(this, arguments));
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

    applyNodeProps(this._stage, this.props);

    this._mountNode = KonvaRenderer.createContainer(this._stage);
    KonvaRenderer.updateContainer(this.props.children, this._mountNode, this);
  };

  Stage.prototype.componentDidUpdate = function componentDidUpdate(prevProps, prevState) {
    if (!Konva.isBrowser) {
      return;
    }
    applyNodeProps(this._stage, this.props, prevProps);

    KonvaRenderer.updateContainer(this.props.children, this._mountNode, this);
  };

  Stage.prototype.componentWillUnmount = function componentWillUnmount() {
    if (!Konva.isBrowser) {
      return;
    }
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
}(Component);

var KONVA_NODES = ['Layer', 'FastLayer', 'Group', 'Label', 'Rect', 'Circle', 'Ellipse', 'Wedge', 'Line', 'Sprite', 'Image', 'Text', 'TextPath', 'Star', 'Ring', 'Arc', 'Tag', 'Path', 'RegularPolygon', 'Arrow', 'Shape', 'Transformer'];

var TYPES = {};

KONVA_NODES.forEach(function (nodeName) {
  TYPES[nodeName] = nodeName;
});

var UPDATE_SIGNAL = {};

var KonvaRenderer = ReactFiberReconciler({
  appendInitialChild: function appendInitialChild(parentInstance, child) {
    if (typeof child === 'string') {
      // Noop for string children of Text (eg <Text>{'foo'}{'bar'}</Text>)
      invariant(false, 'Don not use plain text as child of Konva.Node. You are using text: "%s"', child);
      return;
    }

    parentInstance.add(child);

    updatePicture(parentInstance);
  },
  createInstance: function createInstance(type, props, internalInstanceHandle) {
    var NodeClass = Konva[type];
    if (!NodeClass) {
      invariant(instance, 'ReactKonva does not support the type "%s". If you want to render DOM elements as part of canvas tree take a look into this demo: https://konvajs.github.io/docs/react/DOM_Portal.html', type);
      return;
    }

    var instance = new NodeClass();
    instance._applyProps = applyNodeProps;
    instance._applyProps(instance, props);

    return instance;
  },
  createTextInstance: function createTextInstance(text, rootContainerInstance, internalInstanceHandle) {
    invariant(false, 'Text components are not supported for now in ReactKonva. You text is: "' + text + '"');
  },
  finalizeInitialChildren: function finalizeInitialChildren(domElement, type, props) {
    return false;
  },
  getPublicInstance: function getPublicInstance(instance) {
    return instance;
  },
  prepareForCommit: function prepareForCommit() {
    // Noop
  },
  prepareUpdate: function prepareUpdate(domElement, type, oldProps, newProps) {
    return UPDATE_SIGNAL;
  },
  resetAfterCommit: function resetAfterCommit() {
    // Noop
  },
  resetTextContent: function resetTextContent(domElement) {
    // Noop
  },
  shouldDeprioritizeSubtree: function shouldDeprioritizeSubtree(type, props) {
    return false;
  },
  getRootHostContext: function getRootHostContext() {
    return emptyObject;
  },
  getChildHostContext: function getChildHostContext() {
    return emptyObject;
  },


  scheduleDeferredCallback: ReactDOMFrameScheduling.rIC,

  shouldSetTextContent: function shouldSetTextContent(type, props) {
    return false;
  },


  // cancelDeferredCallback: ReactScheduler.cancelDeferredCallback,
  now: ReactDOMFrameScheduling.now,

  // The Konva renderer is secondary to the React DOM renderer.
  isPrimaryRenderer: false,

  supportsMutation: true,

  // useSyncScheduling: true,

  appendChild: function appendChild(parentInstance, child) {
    if (child.parent === parentInstance) {
      child.moveToTop();
    } else {
      parentInstance.add(child);
    }

    updatePicture(parentInstance);
  },
  appendChildToContainer: function appendChildToContainer(parentInstance, child) {
    if (child.parent === parentInstance) {
      child.moveToTop();
    } else {
      parentInstance.add(child);
    }
    updatePicture(parentInstance);
  },
  insertBefore: function insertBefore(parentInstance, child, beforeChild) {
    invariant(child !== beforeChild, 'ReactKonva: Can not insert node before itself');
    // remove and add back to reset zIndex
    child.remove();
    parentInstance.add(child);
    child.setZIndex(beforeChild.getZIndex());
    updatePicture(parentInstance);
  },
  insertInContainerBefore: function insertInContainerBefore(parentInstance, child, beforeChild) {
    invariant(child !== beforeChild, 'ReactKonva: Can not insert node before itself');
    // remove and add back to reset zIndex
    child.remove();
    parentInstance.add(child);
    child.setZIndex(beforeChild.getZIndex());
    updatePicture(parentInstance);
  },
  removeChild: function removeChild(parentInstance, child) {
    child.destroy();
    child.off(EVENTS_NAMESPACE);
    updatePicture(parentInstance);
  },
  removeChildFromContainer: function removeChildFromContainer(parentInstance, child) {
    child.destroy();
    child.off(EVENTS_NAMESPACE);
    updatePicture(parentInstance);
  },
  commitTextUpdate: function commitTextUpdate(textInstance, oldText, newText) {
    invariant(false, 'Text components are not yet supported in ReactKonva. You text is: "' + newText + '"');
  },
  commitMount: function commitMount(instance, type, newProps) {
    // Noop
  },
  commitUpdate: function commitUpdate(instance, updatePayload, type, oldProps, newProps) {
    instance._applyProps(instance, newProps, oldProps);
  }
});

KonvaRenderer.injectIntoDevTools({
  findFiberByHostInstance: ReactDOMComponentTree.getClosestInstanceFromNode,
  bundleType: process.env.NODE_ENV !== 'production' ? 1 : 0,
  version: React.version || 16,
  rendererPackageName: 'react-konva',
  getInspectorDataForViewTag: function getInspectorDataForViewTag() {
    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    console.log(args);
  }
});

/** API */

module.exports = _extends({}, TYPES, {
  Stage: Stage
});