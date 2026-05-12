// Imports react-konva by package name so tsc exercises the `exports` map
// (not the `typings` fallback). Triggers TS7016 if the `types` condition is missing.
import { Stage, Layer, Line, Rect } from 'react-konva';
export const _resolved = { Stage, Layer, Line, Rect };
