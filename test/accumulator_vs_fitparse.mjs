// Compressed speed/distance (record field 8) and compressed timestamps, against the
// expected CSV published with python-fitparse (the first record is empty there too).
import fs from 'node:fs';
import { E, EPOCH, ab, same, check, done } from './_lib.mjs';
const c = new URL('../corpus/', import.meta.url);
const recs = E.parseFIT(ab(new URL('python-fitparse__tests_files_compressed-speed-distance.fit', c))).slice(1);
const rows = fs.readFileSync(new URL('python-fitparse__compressed-speed-distance-records.csv', c), 'utf8').trim().split('\n').slice(1).map(l => l.split(','));
let diffs = Math.abs(rows.length - recs.length);
rows.forEach(([t, hr, sp, di, cad], i) => {
  const m = recs[i] || {}; const v = x => x === 'null' ? null : +x;
  [[+t, m.timestamp - EPOCH], [v(hr), m.heart_rate ?? null], [v(sp), m.speed ?? null], [v(di), m.distance ?? null], [v(cad), m.cadence ?? null]].forEach(([e, a]) => { if (!same(a, e)) diffs++; });
});
check(diffs === 0, `compressed-speed-distance: ${rows.length} rows x 5 fields, ${diffs} differences`);
done();
