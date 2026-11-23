import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
export const E = require('../fit_engine.js');
export const EPOCH = 631065600;
export const root = new URL('../', import.meta.url);
export function ab(path) { const b = fs.readFileSync(path); return b.buffer.slice(b.byteOffset, b.byteOffset + b.length); }
export function seeded(s) { return function () { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export const FIELDS = ['altitude', 'heart_rate', 'cadence', 'distance', 'speed', 'power'];
export function same(a, b, tol = 1e-9) { return (a == null && b == null) || (a != null && b != null && Math.abs(a - b) <= tol); }
let failures = 0;
export function check(ok, msg) { console.log((ok ? 'PASS ' : 'FAIL ') + msg); if (!ok) failures++; }
export function done() { if (failures) { console.log(failures + ' failure(s)'); process.exit(1); } }
