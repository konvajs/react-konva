// Asserts that `import 'react-konva'` from ESM resolves to the es/ build
// via the `exports` map, not the CJS lib/ build.
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const resolvedPath = fileURLToPath(import.meta.resolve('react-konva'));
const expectedSuffix = path.join('es', 'ReactKonva.js');

assert.ok(
  resolvedPath.endsWith(expectedSuffix),
  `expected resolution to end with ${expectedSuffix}, got: ${resolvedPath}`
);

console.log('exports-check/runtime: OK ->', resolvedPath);
