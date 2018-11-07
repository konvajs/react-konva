'use strict';

exports.__esModule = true;
exports.createHiddenTextInstance = exports.cloneUnhiddenInstance = exports.cloneHiddenInstance = exports.replaceContainerChildren = exports.finalizeContainerChildren = exports.appendChildToContainerChildSet = exports.createContainerChildSet = exports.cloneInstance = exports.supportsPersistence = undefined;

var _invariant = require('./invariant');

var _invariant2 = _interopRequireDefault(_invariant);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Renderers that don't support persistence
// can re-export everything from this module.

function shim() {
  (0, _invariant2.default)(false, 'The current renderer does not support persistence. ' + 'This error is likely caused by a bug in React. ' + 'Please file an issue.');
}

// Persistence (when unsupported)
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */

var supportsPersistence = exports.supportsPersistence = false;
var cloneInstance = exports.cloneInstance = shim;
var createContainerChildSet = exports.createContainerChildSet = shim;
var appendChildToContainerChildSet = exports.appendChildToContainerChildSet = shim;
var finalizeContainerChildren = exports.finalizeContainerChildren = shim;
var replaceContainerChildren = exports.replaceContainerChildren = shim;
var cloneHiddenInstance = exports.cloneHiddenInstance = shim;
var cloneUnhiddenInstance = exports.cloneUnhiddenInstance = shim;
var createHiddenTextInstance = exports.createHiddenTextInstance = shim;