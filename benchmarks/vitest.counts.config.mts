import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const source = resolve(process.env.BENCH_SOURCE || 'src');
const output = resolve(
  process.env.BENCH_OUTPUT || '.bench-tools/counts-results.json',
);
const browser = process.env.BROWSER || 'chromium';
if (browser !== 'chromium' && browser !== 'firefox' && browser !== 'webkit') {
  throw new Error(`Unsupported BROWSER: ${browser}`);
}
if (process.env.NODE_ENV !== 'production') {
  throw new Error(
    'Run npm run test:performance to use production profiling builds.',
  );
}

function sourceFiles(directory: string, prefix = ''): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const name = prefix + entry.name;
    return entry.isDirectory()
      ? sourceFiles(resolve(directory, entry.name), name + '/')
      : [name];
  });
}
const sourceHash = createHash('sha256');
for (const file of sourceFiles(source).sort())
  sourceHash.update(file).update(readFileSync(resolve(source, file)));

export default defineConfig({
  resolve: {
    alias: [
      {
        find: '#benchmark-source',
        replacement: resolve(source, 'ReactKonva.ts'),
      },
      // Default production builds disable Profiler callbacks. Both renderers
      // need their profiling builds for genuine commit counts.
      { find: /^react-dom\/client$/, replacement: 'react-dom/profiling' },
      {
        find: /^react-reconciler$/,
        replacement: resolve(
          'node_modules/react-reconciler/cjs/react-reconciler.profiling.js',
        ),
      },
    ],
  },
  test: {
    include: ['benchmarks/counts.bench.tsx'],
    browser: {
      enabled: true,
      provider: playwright(),
      headless: true,
      instances: [{ browser }],
      commands: {
        saveCounts: (_, data) => {
          mkdirSync(dirname(output), { recursive: true });
          writeFileSync(
            output,
            JSON.stringify(
              {
                source,
                sourceHash: sourceHash.copy().digest('hex'),
                node: process.version,
                build: 'production-profiling',
                testHash: createHash('sha256')
                  .update(readFileSync('benchmarks/counts.bench.tsx'))
                  .digest('hex'),
                transformerHash: createHash('sha256')
                  .update(
                    readFileSync(
                      'node_modules/konva/lib/shapes/Transformer.js',
                    ),
                  )
                  .digest('hex'),
                ...data,
              },
              null,
              2,
            ) + '\n',
          );
          const metrics = [
            'canvasCommits',
            'domCommits',
            'stateOwnerRenders',
            'transformerUpdates',
            'transformerRefreshes',
            'selectionBounds',
            'anchorSetAttrs',
            'nodeClientRects',
            'rendererFlushes',
            'eventBatches',
            'domFlushes',
            'customBatches',
          ];
          console.table(
            data.results.map((row) => ({
              scenario: row.name,
              status: row.passed ? 'pass' : 'FAIL',
              ...Object.fromEntries(
                metrics.map((key) => [
                  key,
                  row.steps.length
                    ? Math.max(...row.steps.map((step) => step[key]))
                    : undefined,
                ]),
              ),
            })),
          );
          console.log(`Maximum counts per step; full results: ${output}`);
        },
      },
    },
  },
});
