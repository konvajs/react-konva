/**
 * Based on ReactKonva.js
 * Copyright (c) 2017-present Lavrenov Anton.
 * All rights reserved.
 *
 * MIT
 */
'use strict';

const invariant = require('fbjs/lib/invariant');
const emptyObject = require('fbjs/lib/emptyObject');
const React = require('react');
const Konva = require('konva');
const ReactFiberReconciler = require('react-reconciler');
const ReactDOMFrameScheduling = require('./ReactDOMFrameScheduling');

const { Component } = React;

var propsToSkip = { children: true, ref: true, key: true, style: true };

function applyNodeProps(instance, props, oldProps = {}) {
  if ('id' in props) {
    const message = `ReactKonva: You are using "id" attribute for Konva node. In some very rare cases it may produce bugs. Currently we recommend not to use it and use "name" attribute instead.`;
    console.warn(message);
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
        eventName =
          'content' +
          eventName.substr(7, 1).toUpperCase() +
          eventName.substr(8);
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
        eventName =
          'content' +
          eventName.substr(7, 1).toUpperCase() +
          eventName.substr(8);
      }
      if (props[key]) {
        instance.on(eventName, props[key]);
      }
    }
    if (
      !isEvent &&
      (props[key] !== oldProps[key] || props[key] !== instance.getAttr(key))
    ) {
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

class Stage extends Component {
  componentDidMount() {
    const { height, width } = this.props;

    this._stage = new Konva.Stage({
      width: width,
      height: this.props.height,
      container: this._tagRef
    });

    applyNodeProps(this._stage, this.props);

    this._mountNode = KonvaRenderer.createContainer(this._stage);
    KonvaRenderer.updateContainer(this.props.children, this._mountNode, this);
  }

  componentDidUpdate(prevProps, prevState) {
    const props = this.props;

    applyNodeProps(this._stage, this.props, prevProps);

    KonvaRenderer.updateContainer(this.props.children, this._mountNode, this);
  }

  componentWillUnmount() {
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
        ref={ref => (this._tagRef = ref)}
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

const KONVA_NODES = [
  'Layer',
  'FastLayer',
  'Group',
  'Label',
  'Rect',
  'Circle',
  'Ellipse',
  'Wedge',
  'Line',
  'Sprite',
  'Image',
  'Text',
  'TextPath',
  'Star',
  'Ring',
  'Arc',
  'Tag',
  'Path',
  'RegularPolygon',
  'Arrow',
  'Shape'
];

const TYPES = {};

KONVA_NODES.forEach(function(nodeName) {
  TYPES[nodeName] = nodeName;
});

const UPDATE_SIGNAL = {};

const KonvaRenderer = ReactFiberReconciler({
  appendInitialChild(parentInstance, child) {
    if (typeof child === 'string') {
      // Noop for string children of Text (eg <Text>{'foo'}{'bar'}</Text>)
      invariant(
        false,
        'Don not use plain text as child of Konva.Node. You are using text: "%s"',
        child
      );
      return;
    }

    parentInstance.add(child);

    updatePicture(parentInstance);
  },

  createInstance(type, props, internalInstanceHandle) {
    const NodeClass = Konva[type];
    if (!NodeClass) {
      invariant(instance, 'ReactKonva does not support the type "%s"', type);
      return;
    }

    const instance = new NodeClass();
    instance._applyProps = applyNodeProps;
    instance._applyProps(instance, props);

    return instance;
  },

  createTextInstance(text, rootContainerInstance, internalInstanceHandle) {
    invariant(
      false,
      'Text components are not supported for now in ReactKonva.'
    );
  },

  finalizeInitialChildren(domElement, type, props) {
    return false;
  },

  getPublicInstance(instance) {
    return instance;
  },

  prepareForCommit() {
    // Noop
  },

  prepareUpdate(domElement, type, oldProps, newProps) {
    return UPDATE_SIGNAL;
  },

  resetAfterCommit() {
    // Noop
  },

  resetTextContent(domElement) {
    // Noop
  },

  shouldDeprioritizeSubtree(type, props) {
    return false;
  },

  getRootHostContext() {
    return emptyObject;
  },

  getChildHostContext() {
    return emptyObject;
  },

  scheduleDeferredCallback: ReactDOMFrameScheduling.rIC,

  shouldSetTextContent(type, props) {
    return false;
  },

  now: ReactDOMFrameScheduling.now,

  useSyncScheduling: true,

  mutation: {
    appendChild(parentInstance, child) {
      if (child.parent === parentInstance) {
        child.moveToTop();
      } else {
        parentInstance.add(child);
      }

      updatePicture(parentInstance);
    },

    appendChildToContainer(parentInstance, child) {
      if (child.parent === parentInstance) {
        child.moveToTop();
      } else {
        parentInstance.add(child);
      }
      updatePicture(parentInstance);
    },

    insertBefore(parentInstance, child, beforeChild) {
      invariant(
        child !== beforeChild,
        'ReactKonva: Can not insert node before itself'
      );
      // remove and add back to reset zIndex
      child.remove();
      parentInstance.add(child);
      child.setZIndex(beforeChild.getZIndex());
      updatePicture(parentInstance);
    },

    insertInContainerBefore(parentInstance, child, beforeChild) {
      invariant(
        child !== beforeChild,
        'ReactKonva: Can not insert node before itself'
      );
      // remove and add back to reset zIndex
      child.remove();
      parentInstance.add(child);
      child.setZIndex(beforeChild.getZIndex());
      updatePicture(parentInstance);
    },

    removeChild(parentInstance, child) {
      child.destroy();
      updatePicture(parentInstance);
    },

    removeChildFromContainer(parentInstance, child) {
      child.destroy();
      updatePicture(parentInstance);
    },

    commitTextUpdate(textInstance, oldText, newText) {
      invariant(false, 'Text components are not yet supported in ReactKonva.');
    },

    commitMount(instance, type, newProps) {
      // Noop
    },

    commitUpdate(
      instance,
      updatePayload,
      type,
      oldProps,
      newProps,
      fiberInstance
    ) {
      instance._applyProps(instance, newProps, oldProps);
    }
  }
});

/** API */

module.exports = Object.assign({}, TYPES, { Stage });
