'use strict';

exports.__esModule = true;
exports.didNotFindHydratableTextInstance = exports.didNotFindHydratableInstance = exports.didNotFindHydratableContainerTextInstance = exports.didNotFindHydratableContainerInstance = exports.didNotHydrateInstance = exports.didNotHydrateContainerInstance = exports.didNotMatchHydratedTextInstance = exports.didNotMatchHydratedContainerTextInstance = exports.hydrateTextInstance = exports.hydrateInstance = exports.getFirstHydratableChild = exports.getNextHydratableSibling = exports.canHydrateTextInstance = exports.canHydrateInstance = exports.supportsHydration = undefined;

var _invariant = require('./invariant');

var _invariant2 = _interopRequireDefault(_invariant);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Renderers that don't support hydration
// can re-export everything from this module.

function shim() {
  (0, _invariant2.default)(false, 'The current renderer does not support hyration. ' + 'This error is likely caused by a bug in React. ' + 'Please file an issue.');
}

// Hydration (when unsupported)
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */

var supportsHydration = exports.supportsHydration = false;
var canHydrateInstance = exports.canHydrateInstance = shim;
var canHydrateTextInstance = exports.canHydrateTextInstance = shim;
var getNextHydratableSibling = exports.getNextHydratableSibling = shim;
var getFirstHydratableChild = exports.getFirstHydratableChild = shim;
var hydrateInstance = exports.hydrateInstance = shim;
var hydrateTextInstance = exports.hydrateTextInstance = shim;
var didNotMatchHydratedContainerTextInstance = exports.didNotMatchHydratedContainerTextInstance = shim;
var didNotMatchHydratedTextInstance = exports.didNotMatchHydratedTextInstance = shim;
var didNotHydrateContainerInstance = exports.didNotHydrateContainerInstance = shim;
var didNotHydrateInstance = exports.didNotHydrateInstance = shim;
var didNotFindHydratableContainerInstance = exports.didNotFindHydratableContainerInstance = shim;
var didNotFindHydratableContainerTextInstance = exports.didNotFindHydratableContainerTextInstance = shim;
var didNotFindHydratableInstance = exports.didNotFindHydratableInstance = shim;
var didNotFindHydratableTextInstance = exports.didNotFindHydratableTextInstance = shim;