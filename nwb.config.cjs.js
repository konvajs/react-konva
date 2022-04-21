const path = require("path");
module.exports = {
  type: "react-component",
  npm: {
    esModules: false,
    umd: false,
    cjs: true,
  },
  // may be useful for debugging tests
  karma: {
    browsers: ["ChromeHeadless"],
    // browsers: ['Chrome'],
  },
  babel: {
    plugins: [
      [
        // For CommonJS build we need to use the konva/cmj import path so that NodeJS 
        // doesn't complain about a CommonJS file requiring a ES6 Module (Konva) 
        "import-path-replace",
        {
          rules: [
            // require('konva') -> require('konva/cmj')
            {
              match: "konva",
              replacement: "konva/cmj",
            },
            // We need to replace the previous replacement here so there are two steps
            // require('konva/lib/Core) -> require('konva/cmj/lib/Core')
            // require('konva/cmj/lib/Core') -> require('konva/cmj/Core')
            {
              match: "konva/cmj/lib",
              replacement: "konva/cmj",
            },
          ],
        },
      ],
    ],
  },
};
