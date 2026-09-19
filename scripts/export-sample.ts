import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { zipSync, strToU8 } from 'fflate';
import { defaultProject, exportFiles } from '../packages/compiler';
const dir = resolve('examples'); mkdirSync(dir, { recursive: true });
const files = exportFiles(defaultProject);
writeFileSync(resolve(dir, 'Greenwood Archers.zip'), zipSync(Object.fromEntries(Object.entries(files).map(([n, c]) => [n, strToU8(c)]))));
writeFileSync(resolve(dir, 'Greenwood Archers.workshop.json'), JSON.stringify(defaultProject, null, 2));
console.log('Created sample project and native ZIP in', dir);
