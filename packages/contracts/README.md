# Shared Contracts

Language-neutral data contracts shared by the Go API (`services/api`), the Next.js
dashboard (`apps/web`), the Expo shell (`apps/mobile`) and the Python CV worker
(`workers/cv`).

- `schemas/*.schema.json` — JSON Schema (draft-07) source of truth.
- `src/index.ts` — TypeScript mirror of the schemas for web/mobile.

Go structs in `services/api/internal/domain/inventory/model` and the CV worker
output in `workers/cv/run_demo.py` use the same field names. If you change a
schema, update all four consumers in the same commit.

## Entities

| Entity | Purpose |
| --- | --- |
| `DemoRun` | One repeatable demo execution over a fixed input set |
| `ImageSource` | Metadata of one input image (never raw pixels) |
| `AnonymizationEvent` | Audit proof that the irreversible anonymization gate ran |
| `Detection` | One detected inanimate urban object on an anonymized image |

## KVKK invariants encoded here

- `AnonymizationEvent` stores only region **counts** and the masking method.
  No region contents, embeddings, identities or plate text — those fields do
  not exist on purpose.
- `Detection.object_class` is restricted to inanimate urban objects.
  Person/face/plate classes are forbidden by contract.
- `ImageSource` carries provider references and an `anonymized_uri`; there is
  intentionally no field for a raw image URI.
