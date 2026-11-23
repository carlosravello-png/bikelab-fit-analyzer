import { spawnSync } from 'node:child_process';
let bad = 0;
for (const t of ['reader_vs_garmin', 'accumulator_vs_fitparse', 'vi_reference', 'engine_golden']) {
  console.log(`\n== ${t}`);
  const r = spawnSync(process.execPath, [new URL(`./${t}.mjs`, import.meta.url).pathname], { stdio: 'inherit' });
  if (r.status !== 0) bad++;
}
console.log(bad ? `\n${bad} test file(s) failed` : '\nAll tests passed');
process.exit(bad ? 1 : 0);
