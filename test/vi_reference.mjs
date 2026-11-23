// NP and VI against a textbook computation: 30-second rolling mean on 1 s data,
// fourth power, mean, fourth root; average power over the same seconds, zeros included.
import { E, ab, check, done } from './_lib.mjs';
function ref(segments) {
  const roll = []; let all = [];
  for (const S of segments) { all = all.concat(S); for (let i = 29; i < S.length; i++) { let s = 0; for (let j = i - 29; j <= i; j++) s += S[j]; roll.push(s / 30); } }
  return Math.pow(roll.reduce((a, b) => a + b ** 4, 0) / roll.length, 0.25) / (all.reduce((a, b) => a + b, 0) / all.length);
}
const P = []; for (let i = 0; i < 3600; i++) P.push(i % 300 < 60 ? 0 : (i % 90 < 20 ? 450 : 180) + (i % 7));
const recs = P.map((p, i) => ({ timestamp: 1000 + i, power: p })); recs.timer = [];
check(Math.abs(E.mVI(recs) - ref([P])) < 1e-9, '1 Hz with zeros: VI equals the textbook value');
const pw = i => (600 <= i % 1200 && i % 1200 < 690) ? 0 : ((i % 120 < 25) ? 420 : 190 + i % 9);
const S1 = [], S2 = []; for (let i = 0; i < 1800; i++) S1.push(pw(i)); for (let i = 2400; i < 3600; i++) S2.push(pw(i));
const r = E.parseFIT(ab(new URL('../data/synth/synth_pause.fit', import.meta.url)));
check(r.timer.length === 4, 'synth_pause.fit: 4 timer events read');
check(Math.abs(E.mVI(r) - ref([S1, S2])) < 1e-9, 'smart recording (0 W written once per 90 s) + 10-min pause by timer events: VI equals the textbook value');
done();
