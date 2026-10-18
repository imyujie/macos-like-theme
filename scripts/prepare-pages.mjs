// Finishes the GitHub Pages build in `dist/`.
//
// GitHub Pages serves the branch through Jekyll unless `.nojekyll` is present,
// and the docs are a hash-routed single page, so `404.html` is just a copy of
// the entry file for any stray path.
import { copyFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dist = join(process.cwd(), 'dist');

writeFileSync(join(dist, '.nojekyll'), '');
copyFileSync(join(dist, 'index.html'), join(dist, '404.html'));

console.log('Prepared dist/ for GitHub Pages (.nojekyll + 404.html).');
