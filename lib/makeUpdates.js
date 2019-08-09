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
  forwardedRef: true,
  unstable_applyCache: true,
  unstable_applyDrawHitFromCache: true
};

var zIndexWarningShowed = false;
var dragWarningShowed = false;

var EVENTS_NAMESPACE = exports.EVENTS_NAMESPACE = '.react-konva-event';

var useStrictMode = false;
function toggleStrictMode(value) {
  useStrictMode = value;
}

var DRAGGABLE_WARNING = 'ReactKonva: You have a Konva node with draggable = true and position defined but no onDragMove or onDragEnd events are handled.\nPosition of a node will be changed during drag&drop, so you should update state of the react app as well.\nConsider to add onDragMove or onDragEnd events.\nFor more info see: https://github.com/konvajs/react-konva/issues/256\n';

var Z_INDEX_WARNING = 'ReactKonva: You are using "zIndex" attribute for a Konva node.\nreact-konva may get confused with ordering. Just define correct order of elements in your render function of a component.\nFor more info see: https://github.com/konvajs/react-konva/issues/194\n';

function applyNodeProps(instance, props) {
  var oldProps = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  if (!zIndexWarningShowed && 'zIndex' in props) {
    console.warn(Z_INDEX_WARNING);
    zIndexWarningShowed = true;
  }

  if (!dragWarningShowed && props.draggable) {
    var hasPosition = props.x !== undefined || props.y !== undefined;
    var hasEvents = props.onDragEnd || props.onDragMove;
    if (hasPosition && !hasEvents) {
      console.warn(DRAGGABLE_WARNING);
      dragWarningShowed = true;
    }
  }

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
  var updatedProps = {};
  var hasUpdates = false;

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