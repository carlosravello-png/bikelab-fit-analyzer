// Optional (needs network): the engine pieces in fit_engine.js are byte-identical to
// the script of the live tool in English, and to the Spanish and Portuguese pages
// except for the language of the "no records" message.
import fs from 'node:fs';
import crypto from 'node:crypto';
import { check, done } from './_lib.mjs';
const man = JSON.parse(fs.readFileSync(new URL('../engine_manifest.json', import.meta.url)));
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
function piece(js, name) {
  if (name === 'VIT') { const m = js.match(/\/\/ VI: TrainingPeaks[^\n]*\r?\nvar VIT=\{[^\n]*\};/); return m && m[0].replace(/\r\n/g, '\n'); }
  const re = new RegExp('function\\s+' + name + '\\s*\\(', 'g'); const hits = [...js.matchAll(re)]; if (hits.length !== 1) return null;
  let d = 0, i = js.indexOf('{', hits[0].index);
  for (let k = i; k < js.length; k++) { if (js[k] === '{') d++; else if (js[k] === '}' && --d === 0) return js.slice(hits[0].index, k + 1).replace(/\r\n/g, '\n'); }
}
const MSG = { es: 'el archivo no trae registros de actividad', pt: 'o arquivo não contém registros de atividade', en: 'the file contains no activity records' };
for (const L of ['en', 'es', 'pt']) {
  const html = await (await fetch(`https://www.bikelabstudio.com/articles/fit-analyzer-${L}`)).text();
  const js = [...html.matchAll(/<script(?![^>]*ld\+json)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).find(s => s.length > 2000) || '';
  for (const [name, h] of Object.entries(man.pieces)) {
    let p = piece(js, name); if (p && name === 'parseFIT') p = p.replace(MSG[L], MSG.en);
    check(p != null && sha(p) === h, `${L} page: ${name} identical`);
  }
}
done();
