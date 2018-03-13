// from https://github.com/facebook/react/blob/87ae211ccd8d61796cfdef138d1e12fb7a74f85d/packages/shared/ReactTypeOfWork.js
const HostComponent = 5;
const HostText = 6;

// adapted FROM: https://github.com/facebook/react/blob/master/packages/react-dom/src/client/ReactDOMComponentTree.js

const randomKey = Math.random()
  .toString(36)
  .slice(2);
const internalInstanceKey = '__reactInternalInstance$' + randomKey;

/**
 * Given a DOM node, return the closest ReactDOMComponent or
 * ReactDOMTextComponent instance ancestor.
 */
export function getClosestInstanceFromNode(node) {
  if (node[internalInstanceKey]) {
    return node[internalInstanceKey];
  }

  while (!node[internalInstanceKey]) {
    if (node.parentNode) {
      node = node.parentNode;
    } else {
      // Top of the tree. This node must not be part of a React tree (or is
      // unmounted, potentially).
      return null;
    }
  }

  let inst = node[internalInstanceKey];
  if (inst.tag === HostComponent || inst.tag === HostText) {
    // In Fiber, this will always be the deepest root.
    return inst;
  }

  return null;
}
