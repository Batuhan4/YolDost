# Product Decision: OmniSight Consumer Routing

## User and Problem

OmniSight is for people choosing a walking route, particularly at night or in
an unfamiliar neighborhood. Standard maps compare routes mainly by travel time
and distance. They do not explain differences in physical openness, sidewalk
availability, greenery, built density, or active-frontage potential.

## Product Promise

OmniSight requests real walking alternatives from Google Routes API and
re-ranks them only when matching physical street-analysis coverage exists.
Users can prefer:

- balanced
- more open
- sidewalk-friendly
- greener
- active-frontage potential

The product does not guarantee safety, predict crime, count pedestrians, or
infer demographics. Required wording is:

> Fiziksel cevre gostergelerine gore daha guvenli rota potansiyeli.

When physical-analysis coverage is insufficient, the API returns the Google
alternatives without inventing an OmniSight ranking.

## Data Boundaries

- Google Routes supplies live walking alternatives. Route results are not
  persistently cached and Google attribution is mandatory.
- Hugging Face / Mapillary open-license images support the current model demo.
- Municipal or MOBESE imagery requires written processing authorization and an
  official stream/API. Public viewing access alone is insufficient.
- Faces and plates are irreversibly masked locally before model inference,
  upload, training, or display.
- Person/rider/vehicle segmentation classes are discarded before persistence.

## Revenue Hypotheses

Revenue is not validated yet. Candidate models:

1. Contextual local sponsorships or promoted venues near a route.
2. Premium route preferences and saved personal mobility settings.
3. Institutional mobility partnerships with campuses, hotels, events, or
   employers.
4. Aggregated municipal planning analytics as a separate future B2B product.

Ads or sponsorships must never alter physical route scores or be presented as
safety evidence.

## Cursor SDK Assistant

Cursor SDK will power an optional server-side Route Assistant that explains
why one route was recommended from structured metrics. End users do not log in
to Cursor. The application uses a server-held `CURSOR_API_KEY`.

The assistant:

- receives route metrics, not raw imagery or location history
- cannot change route scores
- cannot claim guaranteed safety
- returns an explicit unavailable response when SDK auth/service is missing
- has no mock AI response

The Go API on Render remains the mandatory core backend. The TypeScript Cursor
SDK endpoint is a Vercel server-side bonus integration.
