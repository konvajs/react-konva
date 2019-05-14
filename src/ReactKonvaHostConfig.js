import Konva from 'konva/lib/Core';
import { applyNodeProps, updatePicture, EVENTS_NAMESPACE } from './makeUpdates';

import invariant from './invariant';

export * from './HostConfigWithNoPersistence';
export * from './HostConfigWithNoHydration';

import {
  unstable_scheduleCallback as scheduleDeferredCallback,
  unstable_cancelCallback as cancelDeferredCallback
} from 'scheduler';

export {
  unstable_now as now,
  unstable_scheduleCallback as scheduleDeferredCallback,
  unstable_shouldYield as shouldYield,
  unstable_cancelCallback as cancelDeferredCallback
} from 'scheduler';

const NO_CONTEXT = {};
const UPDATE_SIGNAL = {};

// for react-spring capability
Konva.Node.prototype._applyProps = applyNodeProps;

export function appendInitialChild(parentInstance, child) {
  if (typeof child === 'string') {
    // Noop for string children of Text (eg <Text>foo</Text>)
    invariant(
      false,
      'Don not use plain text as child of Konva.Node. You are using text: "%s"',
      child
    );
    return;
  }

  parentInstance.add(child);

  updatePicture(parentInstance);
}

export function createInstance(type, props, internalInstanceHandle) {
  const NodeClass = Konva[type];
  if (!NodeClass) {
    invariant(
      instance,
      'Konva has no node with the type "%s". If you use minimal version of react-konva, just import required nodes into Konva: `import "konva/lib/shapes/Rect"`  If you want to render DOM elements as part of canvas tree take a look into this demo: https://konvajs.github.io/docs/react/DOM_Portal.html',
      type
    );
    return;
  }

  const instance = new NodeClass();
  applyNodeProps(instance, props);

  return instance;
}

export function createTextInstance(
  text,
  rootContainerInstance,
  internalInstanceHandle
) {
  invariant(
    false,
    'Text components are not supported for now in ReactKonva. You text is: "' +
      text +
      '"'
  );
}

export function finalizeInitialChildren(domElement, type, props) {
  return false;
}

export function getPublicInstance(instance) {
  return instance;
}

export function prepareForCommit() {
  // Noop
}

export function prepareUpdate(domElement, type, oldProps, newProps) {
  return UPDATE_SIGNAL;
}

export function resetAfterCommit() {
  // Noop
}

export function resetTextContent(domElement) {
  // Noop
}

export function shouldDeprioritizeSubtree(type, props) {
  return false;
}

export function getRootHostContext() {
  return NO_CONTEXT;
}

export function getChildHostContext() {
  return NO_CONTEXT;
}

export const scheduleTimeout = setTimeout;
export const cancelTimeout = clearTimeout;
export const noTimeout = -1;
export const schedulePassiveEffects = scheduleDeferredCallback;
export const cancelPassiveEffects = cancelDeferredCallback;

export function shouldSetTextContent(type, props) {
  return false;
}

// The Konva renderer is secondary to the React DOM renderer.
export const isPrimaryRenderer = false;

export const supportsMutation = true;

export function appendChild(parentInstance, child) {
  if (child.parent === parentInstance) {
    child.moveToTop();
  } else {
    parentInstance.add(child);
  }

  updatePicture(parentInstance);
}

export function appendChildToContainer(parentInstance, child) {
  if (child.parent === parentInstance) {
    child.moveToTop();
  } else {
    parentInstance.add(child);
  }
  updatePicture(parentInstance);
}

export function insertBefore(parentInstance, child, beforeChild) {
  invariant(
    child !== beforeChild,
    'ReactKonva: Can not insert node before itself'
  );
  // remove and add back to reset zIndex
  child.remove();
  parentInstance.add(child);
  child.setZIndex(beforeChild.getZIndex());
  updatePicture(parentInstance);
}

export function insertInContainerBefore(parentInstance, child, beforeChild) {
  invariant(
    child !== beforeChild,
    'ReactKonva: Can not insert node before itself'
  );
  // remove and add back to reset zIndex
  child.remove();
  parentInstance.add(child);
  child.setZIndex(beforeChild.getZIndex());
  updatePicture(parentInstance);
}

export function removeChild(parentInstance, child) {
  child.destroy();
  child.off(EVENTS_NAMESPACE);
  updatePicture(parentInstance);
}

export function removeChildFromContainer(parentInstance, child) {
  child.destroy();
  child.off(EVENTS_NAMESPACE);
  updatePicture(parentInstance);
}

export function commitTextUpdate(textInstance, oldText, newText) {
  invariant(
    false,
    'Text components are not yet supported in ReactKonva. You text is: "' +
      newText +
      '"'
  );
}

export function commitMount(instance, type, newProps) {
  // Noop
}

export function commitUpdate(
  instance,
  updatePayload,
  type,
  oldProps,
  newProps
) {
  applyNodeProps(instance, newProps, oldProps);
}

export function hideInstance(instance) {
  instance.hide();
  updatePicture(instance);
}

export function hideTextInstance(textInstance) {
  // Noop
}

export function unhideInstance(instance, props) {
  if (props.visible == null || props.visible) {
    instance.show();
  }
}

export function unhideTextInstance(textInstance, text) {
  // Noop
}
