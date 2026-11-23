// The FIT reader against Garmin's official decoder (@garmin/fitsdk, dev dependency only).
import fs from 'node:fs';
import { Decoder, Stream } from '@garmin/fitsdk';
import { E, EPOCH, ab, FIELDS, same, check, done } from './_lib.mjs';
// Files Garmin's JavaScript SDK cannot read (it rejects compressed timestamps or throws).
// They are checked against fitdecode and the fitparse CSV instead.
const GARMIN_UNREADABLE = new Set([
  'python-fitparse__tests_files_antfs-dump.63.fit',
  'python-fitparse__tests_files_compressed-speed-distance.fit',
  'fit-parser__examples_triathlon_summary_first.fit',
  'fit-parser__examples_triathlon_summary_last.fit',
  'synth_compressed.fit']);
const dirs = [new URL('../corpus/', import.meta.url), new URL('../data/synth/', import.meta.url)];
let nFiles = 0, nRecs = 0;
for (const d of dirs) for (const name of fs.readdirSync(d).filter(f => /\.fit$/i.test(f)).sort()) {
  const p = new URL(name, d);
  const r = new Decoder(Stream.fromBuffer(fs.readFileSync(p))).read({ applyScaleAndOffset: true, expandComponents: false, convertDateTimesToDates: false, convertTypesToStrings: false, mergeHeartRates: false });
  const g = (r.messages.recordMesgs || []).filter(x => x.timestamp != null).map((x, i) => [x, i])
    .sort((a, b) => a[0].timestamp - b[0].timestamp || a[1] - b[1]).map(x => x[0]);
  const gEv = (r.messages.eventMesgs || []).filter(e => e.event === 0 && e.eventType != null && e.timestamp != null).map(e => ({ t: e.timestamp + EPOCH, k: e.eventType })).sort((a, b) => a.t - b.t);
  let mine = [];
  try { mine = E.parseFIT(ab(p)); } catch (e) { mine = []; }
  if (!g.length && !mine.length) continue;
  if (GARMIN_UNREADABLE.has(name)) { check(mine.length > g.length, `${name}: Garmin SDK stops at ${g.length} records, reader reads ${mine.length} (checked against fitdecode)`); continue; }
  let diffs = Math.abs(g.length - mine.length);
  for (let i = 0; i < Math.min(g.length, mine.length); i++) {
    const q = g[i], m = mine[i];
    const exp = { timestamp: q.timestamp + EPOCH, altitude: q.enhancedAltitude ?? q.altitude ?? null, heart_rate: q.heartRate ?? null, cadence: q.cadence ?? null, distance: q.distance ?? null, speed: q.enhancedSpeed ?? q.speed ?? null, power: q.power ?? null };
    for (const k of ['timestamp', ...FIELDS]) if (!same(m[k] ?? null, exp[k])) diffs++;
  }
  const evOk = JSON.stringify(gEv) === JSON.stringify(mine.timer || []);
  nFiles++; nRecs += g.length;
  check(diffs === 0 && evOk, `${name}: ${mine.length} records, ${diffs} differences, timer events ${evOk ? 'equal' : 'DIFFER'}`);
}
console.log(`reader vs Garmin FIT SDK: ${nFiles} files, ${nRecs} records`);
done();
