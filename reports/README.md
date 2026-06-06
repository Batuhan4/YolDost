# Experiment and Demo Reports

This directory is the evidence source for the jury presentation. Generated
artifacts are grouped by run:

```text
reports/
  data-manifest.json
  modal-accounts.md
  runs/
    <run-id>/
      metrics.json
      report.md
```

Every report must distinguish:

- measured values from assumptions
- model accuracy from inference speed
- raw model outputs from heuristic product scores
- authorized/open-license data from simulated municipal fixtures

## Required Fields

Each model run records:

- run ID and UTC timestamp
- dataset repository, revision, license, selection filters, and sample count
- anonymization models, revisions, method, and masked-region counts
- segmentation/training model repository and revision
- random seed and software versions
- GPU type, workspace profile, wall-clock duration, and throughput
- train/validation split and hyperparameters when training occurs
- accuracy, precision, recall, F1, IoU, or confusion matrix only when matching
  ground-truth labels exist
- physical street indicators and their formulas
- known limitations, failed samples, and untested claims

No report may contain API keys, token values, raw faces, readable plates, raw
image paths, or identifying crops.
