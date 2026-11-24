# BikeLab FIT Analyzer 2.0.0

[![verify](https://github.com/carlosravello-png/bikelab-fit-analyzer/actions/workflows/verify.yml/badge.svg)](https://github.com/carlosravello-png/bikelab-fit-analyzer/actions/workflows/verify.yml)
[![License: PolyForm Noncommercial 1.0.0](https://img.shields.io/badge/license-PolyForm%20Noncommercial%201.0.0-c8922a)](LICENSE.md)
[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.24485833.svg)](https://doi.org/10.5281/zenodo.24485833)

The engine of the [BikeLab FIT Analyzer](https://www.bikelabstudio.com/articles/fit-analyzer-en): it reads a `.fit`
activity file in the browser and reports cadence stability, drivetrain (speed/cadence) stability, climbing stability,
Variability Index (VI = NP/AP) and power:heart-rate decoupling, each with a Monte Carlo uncertainty band.
The file never leaves the user's device.

`fit_engine.js` is the exact code that runs on the live pages: everything between `BEGIN VERBATIM` and `END VERBATIM`
is copied byte for byte from them, and `npm run check:page` verifies it (SHA-256 per function, `engine_manifest.json`).

> **Minimal maintenance.** This tool is not reviewed often. If you find a bug, a file it cannot read or a result that
> does not add up, write to BikeLab on WhatsApp (+51 934 391 545) and, if you can, send the `.fit` file.

## What changed from 1.0.0

Version 1.0.0 (Zenodo record [10.5281/zenodo.20673166](https://doi.org/10.5281/zenodo.20673166); its two uploads of
13 June 2026 are labelled "(no version)" and "2.0" in Zenodo, but the live page cited that code as 1.0.0) had a FIT reader that
stopped at the first data message of local type 0. Garmin devices write `file_id` there, so it returned **zero
records** for Garmin's own test files. Results from 1.0.0 are not comparable with 2.0.0.

| | 1.0.0 | 2.0.0 |
|---|---|---|
| FIT reader | stopped at byte `0x00`; did not skip developer fields; read field 32 (vertical speed) as speed; no compressed-timestamp rollover; one byte order for the whole file | rewritten; see validation below |
| Off-domain behaviour | results silently altered outside bikelabstudio.com | removed |
| VI | 30 *samples*, zero-power samples dropped | 30 *seconds* on the 1 s series, zeros included, pauses from the FIT timer events |
| VI bands | "stable" threshold never used | four bands, thresholds from a published table (below) |
| P(stable/warning/critical) | divided by 500 even when fewer iterations were valid | divided by the valid iterations; they sum to 1 |
| Climbing index | missing initial altitude became 0 m (false climb) | back-filled with the first altitude |
| Long rides | page frozen during the Monte Carlo | runs in chunks of 20 iterations; same result |

## FIT reader: validation

The reader is compared field by field (timestamp, altitude, heart rate, cadence, distance, speed, power) and on the
timer events against:

* **Garmin's decoder** (`@garmin/fitsdk` 21.222.0, used only as a test oracle): 47 public files and 4 synthetic files,
  218,537 records, **0 differences**.
* **fitdecode** (Python), for the 5 files the Garmin JavaScript SDK cannot read (it rejects compressed timestamps or
  throws): 9,627 records, **0 differences**.
* **python-fitparse's expected CSV** for compressed speed/distance (record field 8, 12-bit accumulator): 754 rows,
  **0 differences**.

The public files come from the test suites of the Garmin FIT JavaScript SDK, python-fitparse, fitdecode, fit-parser
and tormoder/fit. They are downloaded at test time from pinned commits and checked by SHA-256
(`test/corpus.json`); they are not redistributed here. They cover files written by Garmin, Wahoo, Coros, Suunto,
Stryd, Sigma, Zwift, Onelap and the Strava app. **Not covered:** Polar, Bryton, Hammerhead.

Supported: 12/14-byte headers, little- and big-endian definitions, developer fields (skipped), compressed timestamp
headers, compressed speed/distance, `enhanced_speed` (73) and `enhanced_altitude` (78) with priority over 6 and 2,
invalid values per base type, chained FIT files, and truncated files (records read before the damage are kept, as
the Garmin SDK does).

## Metrics

| Metric | Definition (as implemented) |
|---|---|
| CV_c | mean coefficient of variation of cadence in 30-sample windows (step 10), cadence 30–160 rpm, speed > 1 m/s |
| CV_R | coefficient of variation of 60·v/cadence (metres per crank revolution), speed 2.5–20 m/s |
| IES | on climbs (≥ 3 % over 50 samples, ≥ 30 samples long): mean of ½·CV(speed) + ½·CV(cadence) |
| VI | NP/AP. NP: 30 s rolling mean on the 1 s series, 4th power, mean, 4th root. AP over the same seconds, zeros included. Seconds without a sample take the last recorded value (smart recording). Pauses: FIT timer stop events; files without timer events use a 30 s gap |
| Pw:HR | (mean P/HR first half − mean P/HR second half) / first half × 100 |

Monte Carlo: 500 iterations; speed ± 0.3 m/s and altitude ± 2 m (uniform), cadence dropout 5–15 % per sample,
power ± 2 % (uniform). Output: median, 5th–95th percentile band and the share of iterations in each band.

## Thresholds

* **VI** — from the TrainingPeaks Help Center reference table, article 204071734 (page dated 24 Aug 2026, read
  23 Nov 2026): very steady < 1.02 (steady/endurance ceiling); steady < 1.06 on road (flat road race ceiling) and
  < 1.13 on MTB (floor of the MTB/cyclocross race range); critical ≥ 1.35 on road (hilly road race / flat criterium
  ceiling) and ≥ 1.50 on MTB. **Gravel is not in that table and uses the road values.**
* **CV_c, CV_R, IES, Pw:HR** — BikeLab heuristics with additive corrections by discipline, suspension, drivetrain and
  wheel size. **They have not been validated against measured data.** Treat their labels as a screening aid, not a
  diagnosis.

## Known limits and differences with the white paper

The 1.0.0 white paper describes things this engine does not do: Normal (not uniform) power noise, dropout drawn once
per iteration (here per sample), linear interpolation of gaps ≤ 2 s and segmentation at gaps > 3–5 s for the
variance metrics. CV_c, CV_R and IES count samples, not seconds, so smart recording changes their windows. Duration is
elapsed time, pauses included.

## Run the checks

```
npm install
npm run corpus      # downloads the public test files (pinned commits, SHA-256)
npm test            # reader vs Garmin SDK, accumulator vs fitparse, VI vs textbook, engine vs golden.json
python -m pip install fitdecode==0.10.0
python test/compare_fitdecode.py
npm run check:page  # optional: engine identical to the live pages
```

`python tools/synth.py` regenerates the synthetic files in `data/synth/`.

## FIT and Garmin

FIT is a protocol of Garmin International. This repository contains no Garmin code: the reader was written from the
protocol and checked against Garmin's decoder, which is installed only as a development dependency under Garmin's
own licence. BikeLab Studio is not affiliated with Garmin. See `NOTICE`.

## License and citation

[PolyForm Noncommercial 1.0.0](LICENSE.md): free for any noncommercial purpose, including research, teaching and
personal use. Commercial use needs written permission from the author.

> Ravello Joo, C. E. (2026). *BikeLab FIT Analyzer* (Version 2.0.0) [Software]. Zenodo. https://doi.org/10.5281/zenodo.24485834

All versions: DOI [10.5281/zenodo.24485833](https://doi.org/10.5281/zenodo.24485833). See `CITATION.cff`.

Author: Carlos Eduardo Ravello Joo — BikeLab Studio, Trujillo, Peru — ORCID
[0009-0007-5631-7436](https://orcid.org/0009-0007-5631-7436).
