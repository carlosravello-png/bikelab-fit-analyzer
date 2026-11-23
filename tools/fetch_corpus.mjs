// Downloads the public FIT test files listed in test/corpus.json from their
// pinned commits and checks each SHA-256. Files go to ./corpus (git-ignored).
import fs from 'node:fs';
import crypto from 'node:crypto';
const { files } = JSON.parse(fs.readFileSync(new URL('../test/corpus.json', import.meta.url)));
const dir = new URL('../corpus/', import.meta.url);
fs.mkdirSync(dir, { recursive: true });
let bad = 0;
for (const f of files) {
  const dest = new URL(f.name, dir);
  let buf = fs.existsSync(dest) ? fs.readFileSync(dest) : null;
  if (!buf || crypto.createHash('sha256').update(buf).digest('hex') !== f.sha256) {
    const url = `https://raw.githubusercontent.com/${f.repo}/${f.commit}/${f.path}`;
    const r = await fetch(url);
    if (!r.ok) { console.log('FAIL', r.status, url); bad++; continue; }
    buf = Buffer.from(await r.arrayBuffer());
    fs.writeFileSync(dest, buf);
  }
  const h = crypto.createHash('sha256').update(buf).digest('hex');
  if (h !== f.sha256) { console.log('SHA MISMATCH', f.name); bad++; }
}
console.log(`corpus: ${files.length - bad}/${files.length} files OK`);
process.exit(bad ? 1 : 0);
