// Test the published artifact from an external consumer, not source aliases.
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const consumer = mkdtempSync(join(tmpdir(), 'react-konva-package-'));

try {
  const [{ filename }] = JSON.parse(execFileSync('npm', [
    'pack', '--json', '--ignore-scripts', '--pack-destination', consumer,
  ], { cwd: root, encoding: 'utf8' }));
  const packageDir = join(consumer, 'node_modules/react-konva');
  mkdirSync(packageDir, { recursive: true });
  execFileSync('tar', ['-xzf', join(consumer, filename), '--strip-components=1', '-C', packageDir]);

  // Reuse the installed dependencies, including latest Konva, without a second install.
  const pkg = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8'));
  for (const name of Object.keys({
    ...pkg.dependencies, ...pkg.peerDependencies, '@types/react': true, mobx: true,
  })) {
    const target = join(consumer, 'node_modules', name);
    mkdirSync(join(target, '..'), { recursive: true });
    symlinkSync(join(root, 'node_modules', name), target, 'dir');
  }

  // Disable require(ESM) so newer Node versions cannot hide a wrong CJS entry.
  execFileSync(process.execPath, [
    '--no-experimental-require-module', '--no-experimental-detect-module',
    '--input-type=module', '-e', `
      import assert from 'node:assert/strict';
      import React from 'react';
      import { renderToString } from 'react-dom/server';
      import { Stage, Layer, Rect } from 'react-konva';
      assert.equal(
        renderToString(React.createElement(Stage, { title: 'Package import' },
          React.createElement(Layer, null, React.createElement(Rect, { fill: 'red' })))),
        '<div title="Package import"></div>',
      );
    `,
  ], { cwd: consumer, stdio: 'inherit' });
  console.log('Packed ESM package: server rendering OK without require(ESM)');

  execFileSync(process.execPath, [
    '--no-experimental-require-module', '--no-experimental-detect-module',
    '--input-type=module', '-e', `
      import assert from 'node:assert/strict';
      import Konva from 'konva/lib/Core.js';
      import { Stage } from 'react-konva/lib/ReactKonvaCore';
      for (const entry of [
        'react-konva/lib/ReactKonvaCore.js',
        'react-konva/es/ReactKonvaCore',
        'react-konva/es/ReactKonvaCore.js',
      ]) {
        assert.equal((await import(entry)).Stage, Stage, entry);
      }
      assert.equal(Konva.Rect, undefined, 'minimal imports do not register shapes');
    `,
  ], { cwd: consumer, stdio: 'inherit' });
  console.log('Packed minimal imports: shared components without loading shapes');

  execFileSync(process.execPath, [
    '--input-type=commonjs', '-e', `
      const assert = require('node:assert/strict');
      const React = require('react');
      const { renderToString } = require('react-dom/server');
      const { Stage } = require('react-konva');
      for (const entry of [
        'react-konva/lib/ReactKonva', 'react-konva/lib/ReactKonva.js',
        'react-konva/lib/ReactKonvaCore', 'react-konva/lib/ReactKonvaCore.js',
      ]) {
        assert.equal(require(entry).Stage, Stage, entry);
      }
      assert.equal(renderToString(React.createElement(Stage, { title: 'CommonJS' })),
        '<div title="CommonJS"></div>');
      assert.equal(require('react-konva/package.json').name, 'react-konva');
      assert.equal(require('react-konva/es/package.json').type, 'module');
      for (const entry of [
        'react-konva/ReactKonvaCore.d.ts',
        'react-konva/lib/ReactKonvaCore.d.ts',
        'react-konva/es/ReactKonvaCore.d.ts',
      ]) {
        assert.ok(require.resolve(entry).endsWith('.d.ts'), entry);
      }
    `,
  ], { cwd: consumer, stdio: 'inherit' });
  console.log('Packed CommonJS package: server rendering and existing paths OK');

  // Reuse the consumer API checks, but resolve the installed package by name.
  const source = readFileSync(join(root, 'test/types/consumer.tsx'), 'utf8')
    .replace("from '../..'", "from 'react-konva'");
  writeFileSync(join(consumer, 'consumer.tsx'), source + `
    import { Stage as LibCore } from 'react-konva/lib/ReactKonvaCore';
    import { Stage as LibCoreJS } from 'react-konva/lib/ReactKonvaCore.js';
    import { Stage as ESCore } from 'react-konva/es/ReactKonvaCore';
    import { Stage as ESCoreJS } from 'react-konva/es/ReactKonvaCore.js';
    const stages: Array<typeof Stage> = [LibCore, LibCoreJS, ESCore, ESCoreJS];
    void stages;
  `);
  for (const [type, module, moduleResolution] of [
    ['module', 'NodeNext', 'NodeNext'],
    ['commonjs', 'NodeNext', 'NodeNext'],
    ['module', 'ESNext', 'Bundler'],
  ]) {
    writeFileSync(join(consumer, 'package.json'), JSON.stringify({ type }));
    writeFileSync(join(consumer, 'tsconfig.json'), JSON.stringify({
      compilerOptions: {
        strict: true, noEmit: true, target: 'ES2020', jsx: 'react',
        lib: ['ES2020', 'DOM', 'ESNext.Collection', 'ESNext.Disposable'], esModuleInterop: true,
        module, moduleResolution,
      },
      files: ['consumer.tsx'],
    }));
    execFileSync(process.execPath, [join(root, 'node_modules/typescript/bin/tsc'), '-p', consumer],
      { cwd: consumer, stdio: 'inherit' });
    console.log(`Packed consumer types: ${moduleResolution} (${type}) OK`);
  }
} finally {
  rmSync(consumer, { recursive: true, force: true });
}
