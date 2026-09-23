# Pipeline cost optimizations (excerpt)

> From the Google Ads exporter repository. All figures are billed bytes from `INFORMATION_SCHEMA.JOBS_BY_PROJECT`, measured on a full `dbt build`, at $6.25/TiB.

| Stage | Per run | Per day | Per month |
|---|---|---|---|
| Original | — | ~2,400 GB | **$449** |
| After accumulating dimensions | 339 GB × 2 | 679 GB | **$126** |
| After the four changes below | 81.6 GB × 1 | 81.6 GB | **$15** |

## 1. The FX model is a table, not a view

Ten marts join this model for currency conversion. As a view, every one of them re-ran a `union distinct` across nine fact views just to enumerate `(account_id, report_date)` pairs.

It was **237 GB of a 339 GB build (70%)**, to produce ~1 MB of output.

| | As view | As table |
|---|---|---|
| 10 marts | **174.5 GB** | **37.7 GB** |
| its 4 `not_null` tests | 62.5 GB | ~0 |

## 2. The FX date spine

A dense spine (active accounts × every date) is a strict superset of the old union, at near-zero cost: **15.6 GB → 205 KiB**.

Verified against the old model on identical inputs: **0 lost pairs, 0 value mismatches.**

### The ECB gap this exposed

The new coverage test failed on first run and found a **pre-existing** bug. The ECB feed went dark for 13 days (2026-05-26 → 06-07), longer than the 7-day carry-forward window. USD/GBP/RON/MXN accounts had null `cost_eur` for six days. The window is now 30 days, which is provably safe: the nearest prior rate is always preferred.

## 3. One `not_null_columns` test per model

dbt issues one query per test, so five `not_null` tests on a view re-execute it five times. One combined test keeps identical coverage and still names the failing columns. Test nodes: **203 → 155**.

## 4. Stage off the daily path

Nothing read the stage datasets except dbt's own tests. Stage was a byte-for-byte duplicate of prod, a flat 50% of the bill.

**The tradeoff, stated plainly:** `prod_test` is now the gate, and it runs after `prod_build`. A bad build is caught immediately afterwards rather than prevented. Run `--include-stage` on any release that changes model SQL.

## Considered and rejected

- **Incremental marts:** Google Ads restates conversions retroactively; a naive incremental would freeze stale numbers. Poor risk-to-reward.
- **Expiring raw partitions:** ~$8/month saved, but permanent data loss. Rejected.
