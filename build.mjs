import { execSync } from 'node:child_process';
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const pkg = createRequire(import.meta.url)('./package.json');

execSync('tsc -outDir ./es', { stdio: 'inherit' });
execSync('tsc -module commonjs -outDir ./lib', { stdio: 'inherit' });

for (const out of ['es', 'lib']) {
  copyFileSync('ReactKonvaCore.d.ts', `${out}/ReactKonvaCore.d.ts`);
  const corePath = `${out}/ReactKonvaCore.js`;
  const replaced = readFileSync(corePath, 'utf8').replaceAll(
    '{VERSION}',
    pkg.version,
  );
  writeFileSync(corePath, replaced);
  console.log(`Built ${out}/`);
}
