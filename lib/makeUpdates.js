'use strict';

exports.__esModule = true;
exports.toggleStrictMode = toggleStrictMode;
exports.applyNodeProps = applyNodeProps;
exports.updatePicture = updatePicture;
var propsToSkip = {
  children: true,
  ref: true,
  key: true,
  style: true,
  forwardedRef: true
};

var idWarningShowed = false;
var zIndexWarningShowed = false;
var useStrictMode = false;

var EVENTS_NAMESPACE = exports.EVENTS_NAMESPACE = '.react-konva-event';

function toggleStrictMode(value) {
  useStrictMode = value;
}

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

  var strictUpdate = useStrictMode || props._useStrictMode;

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
    if (!isEvent && (props[key] !== oldProps[key] || strictUpdate && props[key] !== instance.getAttr(key))) {
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