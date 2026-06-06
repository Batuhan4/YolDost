# Demo Plan — 3–5 Minute Jury Script

Goal: show a working, repeatable, KVKK-safe vertical slice — not slides.

## Setup (before the jury arrives)

- [ ] `bash scripts/verify.sh` is green
- [ ] Go API running (Render URL, or `make run` in `services/api` as backup)
- [ ] Web dashboard open (Vercel URL, or `npm run dev` as backup)
- [ ] Terminal ready in repo root for the fixture run
- [ ] `data/processed/` cleaned so the run is visibly fresh

## Script

**0:00 — Problem (30s).**
"Güngören'in atık toplama araçları her sokaktan düzenli geçiyor. Bu
görüntüleri KVKK'ya uygun şekilde kentsel envantere çeviriyoruz: kişi değil,
tabela, konteyner, direk, yol hasarı." One sentence on the cost of manual
surveys.

**0:30 — KVKK gate first (60s).**
This is the differentiator — show it before the product:

```bash
python3 workers/cv/run_demo.py --input /tmp/raw-photo.jpg --output /tmp/x.json
```

→ the worker **refuses** raw imagery (exit 3, explicit KVKK message). Then:
"Yüz ve plaka tespiti yalnızca geri döndürülemez bulanıklaştırma için var.
Denetim kaydında sadece bölge SAYISI tutulur — içerik alanı şemada yok."

**1:30 — Repeatable detection run (60s).**

```bash
bash scripts/demo-fixture.sh
```

→ narrates: 3 images, 7 detections, 5 regions anonymized, **two runs
byte-identical** (the script diffs them live — repeatability proven, not
claimed).

**2:30 — Dashboard (60s).**
Web UI: demo status panel (counts), KVKK panel (gate checklist), detections
table (class/confidence/coords), API health (live Render readiness). Point at
the data source badge: live API vs fixture fallback.

**3:30 — Architecture + AI usage (45s).**
One breath: "Go backend masterfabric-go mimarisinde, Render'da; Next.js
Vercel'de; modeller Hugging Face'ten; Cursor ruleset + ajanlarla geliştirildi
— commit geçmişi checkpoint checkpoint görülebilir." Show
`scripts/generate-demo-report.py` output if time allows (Cursor SDK bonus
integration point).

**4:15 — Close (15s).**
"Ham veri repo'ya hiç girmedi, hackathon sonunda imha tutanağıyla siliniyor.
Sonraki adım: gerçek anonimleştirme hattı + Render Postgres."

## Fallback matrix

| Failure | Fallback | Why it works |
| --- | --- | --- |
| Render API down | run `make run` locally; web hits localhost | same code, same data |
| API completely unreachable | dashboard auto-falls back to embedded fixture snapshot with an explicit "fixture fallback" badge | demo never blanks |
| HF model / network unavailable | placeholder mode is the demo path already — zero model dependency | deterministic by design |
| Vercel down | `npm run dev` locally | dashboard is static + client fetch |
| Projector/laptop swap | `docs/demo-report.md` (regenerable) tells the same story in markdown | one file |

## Reset for repeat runs

```bash
rm -f data/processed/demo-result.json docs/demo-report.md
bash scripts/demo-fixture.sh && python3 scripts/generate-demo-report.py
```

Same input → byte-identical output, every time, in front of the jury.
