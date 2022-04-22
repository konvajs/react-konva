const isCommonJS = process.env.IS_CJS === "1";
const resolverRoot = isCommonJS ? "./lib" : "./es";

module.exports = {
  compact: false,
  retainLines: true,
  minified: false,
  inputSourceMap: false,
  sourceMaps: false,
  plugins: [
    [
      "module-resolver",
      {
        root: [resolverRoot],
        alias: {
          "@konva": isCommonJS ? "konva/cmj" : "konva/lib",
        },
      },
      "konva",
    ],
		[
      "module-resolver",
      {
        root: [resolverRoot],
        alias: {
          "@konva-index": isCommonJS ? "konva/cmj" : "konva",
        },
      },
      "konva-index",
    ],
  ],
};
