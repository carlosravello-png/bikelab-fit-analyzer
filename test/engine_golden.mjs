// Full engine with a seeded random generator: results must match test/golden.json,
// and the in-chunks version (used by the page) must equal the single-pass version.
import fs from 'node:fs';
import { E, ab, seeded, check, done } from './_lib.mjs';
const CFG = [{ discipline: 'ruta', suspension: 'rigida', transmission: '2x', wheel: '29' }, { discipline: 'mtb', suspension: 'doble', transmission: '1x', wheel: '27.5' }, { discipline: 'gravel', suspension: 'hardtail', transmission: '1x', wheel: '26' }];
const FILES = ['data/synth/synth_fields.fit', 'data/synth/synth_pause.fit', 'data/synth/synth_bigendian.fit', 'corpus/fit-javascript-sdk__test_data_WithGearChangeData.fit', 'corpus/fit-javascript-sdk__test_data_Activity.fit'];
const goldenPath = new URL('golden.json', import.meta.url);
const out = {};
for (const f of FILES) {
  const recs = E.parseFIT(ab(new URL('../' + f, import.meta.url)));
  for (const c of CFG) {
    Math.random = seeded(2026); const a = E.computeAll(recs, c);
    Math.random = seeded(2026); const b = await new Promise((ok, ko) => E.computeAllAsync(recs, c, null, ok, ko));
    check(JSON.stringify(a) === JSON.stringify(b), `${f} ${c.discipline}: chunked = single pass`);
    for (const k of ['cv', 'vc', 'ies', 'vi', 'pw']) if (a[k].status !== 'na') check(Math.abs(a[k].P_s + a[k].P_w + a[k].P_f - 1) < 1e-12, `${f} ${c.discipline} ${k}: probabilities sum to 1`);
    out[f + '|' + c.discipline] = Object.fromEntries(['cv', 'vc', 'ies', 'vi', 'pw'].map(k => [k, [a[k].status, a[k].M_obs]]));
  }
}
if (process.argv.includes('--write')) { fs.writeFileSync(goldenPath, JSON.stringify(out, null, 1)); console.log('golden.json written'); }
else { const g = JSON.parse(fs.readFileSync(goldenPath)); check(JSON.stringify(g) === JSON.stringify(out), 'results equal test/golden.json'); }
done();
