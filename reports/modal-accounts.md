# Modal GPU Availability

Tested on 6 June 2026 with a short T4 allocation. Token values are stored only
in the ignored local `.env`.

| Profile | Authentication | T4 allocation | Current decision |
|---|---|---|---|
| `kosed4304` | active | passed | primary |
| `sweetsavagetr` | active | passed | fallback 1 |
| `a2` | active | passed | fallback 2 |
| `batuhan4` | active | billing limit reached | disabled |
| `a1` | active | billing limit reached | disabled |

The Modal billing CLI returned no June usage rows for the three usable
workspaces. That does not prove a remaining credit amount; GPU allocation is
the operational readiness check.
