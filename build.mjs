import { execSync } from 'node:child_process';
import { copyFileSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const pkg = createRequire(import.meta.url)('./package.json');

for (const out of ['es', 'lib']) {
  rmSync(out, { recursive: true, force: true });
}

execSync('tsc --module ESNext --moduleResolution bundler --outDir ./es', {
  stdio: 'inherit',
});
execSync('tsc --outDir ./lib', { stdio: 'inherit' });

for (const out of ['es', 'lib']) {
  if (out === 'es') {
    writeFileSync(`${out}/package.json`, '{"type":"module"}\n');
  }
  copyFileSync('ReactKonvaCore.d.ts', `${out}/ReactKonvaCore.d.ts`);
  const corePath = `${out}/ReactKonvaCore.js`;
  const replaced = readFileSync(corePath, 'utf8').replaceAll(
    '{VERSION}',
    pkg.version,
  );
  writeFileSync(corePath, replaced);
  console.log(`Built ${out}/`);
}
