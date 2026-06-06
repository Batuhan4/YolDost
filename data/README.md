# Data Policy (KVKK)

| Directory | Tracked in git? | Contents |
| --- | --- | --- |
| `data/fixtures/` | ✅ yes | Synthetic metadata fixtures only — no imagery, no personal data |
| `data/processed/` | ❌ no (only `.gitkeep`) | Anonymized derivatives and detection JSON produced locally |
| `data/raw/` | ❌ never (gitignored) | Raw imagery lives only on the local machine and is deleted at hackathon end |

Rules:

- Raw images (faces/plates not yet masked) are **never** committed, uploaded to
  public storage, or baked into build artifacts.
- Everything under `data/processed/` must have passed the irreversible
  anonymization gate (`workers/cv`).
- See `docs/kvkk.md` for the full pipeline and the deletion checklist.
