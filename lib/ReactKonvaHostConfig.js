'use strict';

exports.__esModule = true;
exports.supportsMutation = exports.isPrimaryRenderer = exports.cancelPassiveEffects = exports.schedulePassiveEffects = exports.noTimeout = exports.cancelTimeout = exports.scheduleTimeout = exports.cancelDeferredCallback = exports.shouldYield = exports.scheduleDeferredCallback = exports.now = undefined;

var _HostConfigWithNoPersistence = require('./HostConfigWithNoPersistence');

Object.keys(_HostConfigWithNoPersistence).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _HostConfigWithNoPersistence[key];
    }
  });
});

var _HostConfigWithNoHydration = require('./HostConfigWithNoHydration');

Object.keys(_HostConfigWithNoHydration).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _HostConfigWithNoHydration[key];
    }
  });
});

var _scheduler = require('scheduler');

Object.defineProperty(exports, 'now', {
  enumerable: true,
  get: function get() {
    return _scheduler.unstable_now;
  }
});
Object.defineProperty(exports, 'scheduleDeferredCallback', {
  enumerable: true,
  get: function get() {
    return _scheduler.unstable_scheduleCallback;
  }
});
Object.defineProperty(exports, 'shouldYield', {
  enumerable: true,
  get: function get() {
    return _scheduler.unstable_shouldYield;
  }
});
Object.defineProperty(exports, 'cancelDeferredCallback', {
  enumerable: true,
  get: function get() {
    return _scheduler.unstable_cancelCallback;
  }
});
exports.appendInitialChild = appendInitialChild;
exports.createInstance = createInstance;
exports.createTextInstance = createTextInstance;
exports.finalizeInitialChildren = finalizeInitialChildren;
exports.getPublicInstance = getPublicInstance;
exports.prepareForCommit = prepareForCommit;
exports.prepareUpdate = prepareUpdate;
exports.resetAfterCommit = resetAfterCommit;
exports.resetTextContent = resetTextContent;
exports.shouldDeprioritizeSubtree = shouldDeprioritizeSubtree;
exports.getRootHostContext = getRootHostContext;
exports.getChildHostContext = getChildHostContext;
exports.shouldSetTextContent = shouldSetTextContent;
exports.appendChild = appendChild;
exports.appendChildToContainer = appendChildToContainer;
exports.insertBefore = insertBefore;
exports.insertInContainerBefore = insertInContainerBefore;
exports.removeChild = removeChild;
exports.removeChildFromContainer = removeChildFromContainer;
exports.commitTextUpdate = commitTextUpdate;
exports.commitMount = commitMount;
exports.commitUpdate = commitUpdate;
exports.hideInstance = hideInstance;
exports.hideTextInstance = hideTextInstance;
exports.unhideInstance = unhideInstance;
exports.unhideTextInstance = unhideTextInstance;

var _konva = require('konva');

var _konva2 = _interopRequireDefault(_konva);

var _makeUpdates = require('./makeUpdates');

var _invariant = require('./invariant');

var _invariant2 = _interopRequireDefault(_invariant);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var NO_CONTEXT = {};
var UPDATE_SIGNAL = {};

// for react-spring capability
_konva2.default.Node.prototype._applyProps = _makeUpdates.applyNodeProps;

function appendInitialChild(parentInstance, child) {
  if (typeof child === 'string') {
    // Noop for string children of Text (eg <Text>foo</Text>)
    (0, _invariant2.default)(false, 'Don not use plain text as child of Konva.Node. You are using text: "%s"', child);
    return;
  }

  parentInstance.add(child);

  (0, _makeUpdates.updatePicture)(parentInstance);
}

function createInstance(type, props, internalInstanceHandle) {
  var NodeClass = _konva2.default[type];
  if (!NodeClass) {
    (0, _invariant2.default)(instance, 'ReactKonva does not support the type "%s". If you want to render DOM elements as part of canvas tree take a look into this demo: https://konvajs.github.io/docs/react/DOM_Portal.html', type);
    return;
  }

  var instance = new NodeClass();
  (0, _makeUpdates.applyNodeProps)(instance, props);

  return instance;
}

function createTextInstance(text, rootContainerInstance, internalInstanceHandle) {
  (0, _invariant2.default)(false, 'Text components are not supported for now in ReactKonva. You text is: "' + text + '"');
}

function finalizeInitialChildren(domElement, type, props) {
  return false;
}

function getPublicInstance(instance) {
  return instance;
}

function prepareForCommit() {
  // Noop
}

function prepareUpdate(domElement, type, oldProps, newProps) {
  return UPDATE_SIGNAL;
}

function resetAfterCommit() {
  // Noop
}

function resetTextContent(domElement) {
  // Noop
}

function shouldDeprioritizeSubtree(type, props) {
  return false;
}

function getRootHostContext() {
  return NO_CONTEXT;
}

function getChildHostContext() {
  return NO_CONTEXT;
}

var scheduleTimeout = exports.scheduleTimeout = setTimeout;
var cancelTimeout = exports.cancelTimeout = clearTimeout;
var noTimeout = exports.noTimeout = -1;
var schedulePassiveEffects = exports.schedulePassiveEffects = _scheduler.unstable_scheduleCallback;
var cancelPassiveEffects = exports.cancelPassiveEffects = _scheduler.unstable_cancelCallback;

function shouldSetTextContent(type, props) {
  return false;
}

// The Konva renderer is secondary to the React DOM renderer.
var isPrimaryRenderer = exports.isPrimaryRenderer = false;

var supportsMutation = exports.supportsMutation = true;

function appendChild(parentInstance, child) {
  if (child.parent === parentInstance) {
    child.moveToTop();
  } else {
    parentInstance.add(child);
  }

  (0, _makeUpdates.updatePicture)(parentInstance);
}

function appendChildToContainer(parentInstance, child) {
  if (child.parent === parentInstance) {
    child.moveToTop();
  } else {
    parentInstance.add(child);
  }
  (0, _makeUpdates.updatePicture)(parentInstance);
}

function insertBefore(parentInstance, child, beforeChild) {
  (0, _invariant2.default)(child !== beforeChild, 'ReactKonva: Can not insert node before itself');
  // remove and add back to reset zIndex
  child.remove();
  parentInstance.add(child);
  child.setZIndex(beforeChild.getZIndex());
  (0, _makeUpdates.updatePicture)(parentInstance);
}

function insertInContainerBefore(parentInstance, child, beforeChild) {
  (0, _invariant2.default)(child !== beforeChild, 'ReactKonva: Can not insert node before itself');
  // remove and add back to reset zIndex
  child.remove();
  parentInstance.add(child);
  child.setZIndex(beforeChild.getZIndex());
  (0, _makeUpdates.updatePicture)(parentInstance);
}

function removeChild(parentInstance, child) {
  child.destroy();
  child.off(_makeUpdates.EVENTS_NAMESPACE);
  (0, _makeUpdates.updatePicture)(parentInstance);
}

function removeChildFromContainer(parentInstance, child) {
  child.destroy();
  child.off(_makeUpdates.EVENTS_NAMESPACE);
  (0, _makeUpdates.updatePicture)(parentInstance);
}

function commitTextUpdate(textInstance, oldText, newText) {
  (0, _invariant2.default)(false, 'Text components are not yet supported in ReactKonva. You text is: "' + newText + '"');
}

function commitMount(instance, type, newProps) {
  // Noop
}

function commitUpdate(instance, updatePayload, type, oldProps, newProps) {
  (0, _makeUpdates.applyNodeProps)(instance, newProps, oldProps);
}

function hideInstance(instance) {
  instance.hide();
  (0, _makeUpdates.updatePicture)(instance);
}

function hideTextInstance(textInstance) {
  // Noop
}

function unhideInstance(instance, props) {
  if (props.visible == null || props.visible) {
    instance.show();
  }
}

function unhideTextInstance(textInstance, text) {
  // Noop
}