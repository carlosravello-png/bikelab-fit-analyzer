"""The FIT reader against fitdecode (Python) for the files Garmin's JS SDK cannot read."""
import json, subprocess, sys, fitdecode, os
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
FILES = ['python-fitparse__tests_files_antfs-dump.63.fit', 'python-fitparse__tests_files_compressed-speed-distance.fit',
         'fit-parser__examples_triathlon_summary_first.fit', 'fit-parser__examples_triathlon_summary_last.fit',
         '../data/synth/synth_compressed.fit']
bad = 0
for name in FILES:
    p = os.path.join(ROOT, 'corpus', name); recs = []
    with fitdecode.FitReader(p, check_crc=fitdecode.CrcCheck.DISABLED, error_handling=fitdecode.ErrorHandling.WARN) as fr:
        for m in fr:
            if isinstance(m, fitdecode.FitDataMessage) and m.name == 'record':
                g = lambda n: m.get_value(n, fallback=None)
                ts = g('timestamp')
                if ts is None: continue
                recs.append({'t': ts.timestamp() if hasattr(ts, 'timestamp') else ts,
                             'altitude': g('enhanced_altitude') if g('enhanced_altitude') is not None else g('altitude'),
                             'heart_rate': g('heart_rate'), 'cadence': g('cadence'), 'distance': g('distance'),
                             'speed': g('enhanced_speed') if g('enhanced_speed') is not None else g('speed'), 'power': g('power')})
    recs = [r for _, r in sorted(enumerate(recs), key=lambda x: (x[1]['t'], x[0]))]
    js = ("const E=require('./fit_engine.js'),fs=require('fs');const b=fs.readFileSync(process.argv[1]);"
          "console.log(JSON.stringify(E.parseFIT(b.buffer.slice(b.byteOffset,b.byteOffset+b.length))))")
    mine = json.loads(subprocess.check_output(['node', '-e', js, p], cwd=ROOT))
    d = abs(len(mine) - len(recs))
    for a, b in zip(mine, recs):
        for k in ['altitude', 'heart_rate', 'cadence', 'distance', 'speed', 'power']:
            x, y = a.get(k), b[k]
            if not ((x is None and y is None) or (x is not None and y is not None and abs(x - y) < 1e-6)): d += 1
    print(('PASS ' if d == 0 else 'FAIL ') + f'{name}: {len(mine)} records vs fitdecode {len(recs)}, {d} differences')
    bad += d > 0
sys.exit(1 if bad else 0)
