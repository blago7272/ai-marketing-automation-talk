# Google Ads MCP supplement: reconciliation (excerpt)

> 23 September 2026. Abridged; account and campaign IDs and absolute spend removed.

## Source

The official `googleads/google-ads-mcp`, pinned to a fixed commit, supplies **read-only** tools through an in-process client. Requests use a fixed account scope. **Results at the 50,000-row cap are rejected, not treated as complete.** Each export keeps its query arguments, timestamps and row provenance; warehouse imports keep the artifact's SHA-256.

## Backfill and reconciliation

- Window: 365 calendar dates.
- 8,558 campaign/day controls; 160,184 physical user-location rows, including Search **and Performance Max**.
- Every account/campaign/day is reconciled for impressions, clicks, cost, conversions and conversion value. Keys use IDs, never campaign names.
- Small residuals absent from user-location reporting are kept as separate `unallocated_campaign_residual` facts: **~0.0067% of spend**. Imports reject residuals above 0.1%.
- 224 of 226 geography IDs resolved. The 2 unresolved IDs keep their IDs under Unknown. **No name/ID mapping was guessed.**

## Why campaign totals also use MCP

The shared campaign mart is **~0.44% below** the direct API over the same window. **291 dates** exceed the report tolerance. This is not caused by campaign-name drift.

One campaign, one date, same ID:

| Source | Spend EUR | Impressions | Clicks |
| --- | ---: | ---: | ---: |
| MCP campaign query | 95.41 | 32,601 | 360 |
| Raw CampaignBasicStats | 95.41 | 32,601 | 360 |
| Raw CampaignStats → shared mart | **58.28** | 32,601 | 360 |

The discrepancy already exists in the two raw statistics tables, before naming or EUR conversion. The shared export is logged for repair; **this project does not modify it**.

## Precedence

On validated MCP dates, MCP campaign and country totals take precedence. The DTS copy keeps running for comparison and fallback. Switching back requires an explicit precedence change, not just stopping the job.
