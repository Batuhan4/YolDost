# Training Summary

## Selected Run

The selected auxiliary training run is
`20260606T110554Z-modal-scene`.

- Data: 60 locally anonymized Hugging Face / Mapillary derivatives
- Source license: `CC-BY-SA-4.0`
- Privacy gate: solid mask with 20% bounding-box padding
- Regions masked: 1 face, 13 license plates
- Balanced subset: 23 urban and 23 suburban samples
- Split: 36 train, 10 validation
- Base model: `google/vit-base-patch16-224-in21k`
- Base revision: `b4569560a39a0f1af58e3ddaf17facf20ab919b0`
- GPU: NVIDIA B200
- Selected epoch: 1
- Weak-label validation agreement: 80%
- Macro F1: 0.80
- Checkpoint: private Modal Volume `omnisight-training-checkpoints`
- Checkpoint SHA-256:
  `a31bad70de2c207d033535da18f3f65b9c997352c7a1206efef30bfd53f155bf`

This auxiliary classifier separates the dataset's model-generated
`urban/suburban` context labels. It does not measure pedestrian density,
street safety, crime, or SegFormer segmentation accuracy.

## Experiment History

| Run | Change | Result | Decision |
|---|---|---|---|
| `20260606T110222Z-modal-scene` | Imbalanced 47/13 split, 8 epochs | 53.85% agreement, macro F1 0.35 | Rejected: majority-class collapse |
| `20260606T110435Z-modal-scene` | Balanced split, 30 epochs | best 80%, macro F1 0.80; later epochs 70% | Valid experiment; showed early overfitting |
| `20260606T110554Z-modal-scene` | Balanced split, 8 epochs, persisted best checkpoint | best 80%, macro F1 0.80 | Selected reproducible checkpoint run |

## Core Product Model

The product's physical route indicators still come from the SegFormer
baseline:

- model: `nvidia/segformer-b0-finetuned-cityscapes-1024-1024`
- revision: `21b3847fae21ddee674abd31129307b6a1235bd9`
- allowed persisted classes: road, sidewalk, building, wall, fence, pole,
  traffic light, traffic sign, vegetation, terrain, and sky
- discarded classes: person, rider, car, truck, bus, train, motorcycle, bicycle

The demo dataset has no matching pixel-level ground truth, so SegFormer mIoU
and segmentation accuracy have not been measured. This limitation must remain
visible in the presentation.
