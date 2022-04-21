// ES6 build configuration
module.exports = {
  type: "react-component",
  npm: {
    esModules: true,
    umd: false,
    cjs: false
  },
  // may be useful for debugging tests
  karma: {
    browsers: ["ChromeHeadless"],
    // browsers: ['Chrome'],
  },
};
