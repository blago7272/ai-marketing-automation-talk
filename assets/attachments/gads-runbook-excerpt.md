# Runbooks (excerpts)

> From the Google Ads exporter and the healthcare client repositories.

## FX rates: backfilling (docs/fx_rates_operations.md)

`scripts/fx_rates_backfill.py` is idempotent — it deletes the fetched date range for the managed currencies, then appends — so re-running a window is safe.

```bash
python scripts/fx_rates_backfill.py --start-date YYYY-MM-DD --end-date YYYY-MM-DD --dry-run
```

Runs of 1–2 missing days around Easter, 1 May, Christmas and New Year are expected (ECB holidays). Anything longer is a real gap.

## Google Ads daily import: operations (docs/ads-pipeline.md)

```sh
.venv/bin/python scripts/deploy_ads.py
.venv/bin/python -m client_ads.run --full
```

Use `--full` only for an intentional complete refresh. **Inspect failures before retrying; do not weaken checks to turn absent source data into zeros.** Deployment uses application default credentials with an explicit target project, without changing global CLI settings.

## Release orchestrator (README)

```bash
# daily (what Cloud Scheduler invokes)
python scripts/release_orchestrator.py

# validate a code change: stage, then prod
python scripts/release_orchestrator.py --include-stage
```
