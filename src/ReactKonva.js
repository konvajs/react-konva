/**
 * Based on ReactArt.js
 * Copyright (c) 2017-present Lavrenov Anton.
 * All rights reserved.
 *
 * MIT
 */
'use strict';

const ReactKonvaCore = require('./ReactKonvaCore');
// import full konva to enable all nodes
const Konva = require('konva');

// override BaseLayer.batchDraw to get better performance for react components
require('./overrideBatchDraw').overrideBatchDraw(Konva.Layer.__proto__);

module.exports = {
  ...ReactKonvaCore
};
