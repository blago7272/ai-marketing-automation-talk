# Healthcare client dashboard discovery (excerpt)

> 22 September 2026. Abridged; account IDs, project IDs and spend amounts removed.

## Scope and implementation boundary

Discovery inspected local source code, workbook metadata and bounded ranges, live BigQuery schemas and aggregates, Cloud Run job and scheduler metadata, and bounded failure logs. **No reference files, source data, credentials, scheduler settings, or cloud resources were changed.**

Discovery establishes viable sources but does not certify full historical completeness.

## Required dashboard behavior

| View | Dimensions | Measures |
| --- | --- | --- |
| Main Country View | Country → year → month | Commerce revenue, Google Ads cost in EUR, revenue / Ads cost, YoY |
| Google Ads Country View | Country → campaign | Impressions, clicks, cost, conversion value |
| Campaign View | Canonical campaign → year → month | Conversions, conversion value, cost, ROAS, YoY |

The first view's ROAS is a blended business ratio, not Google Ads attribution. Both definitions should be visible in the UI.

## Material gaps and risks

1. **Shopify authorization is currently broken.** The latest extractor run logs HTTP 401.
2. **The existing order extraction omits country.** A customer address is not a safe substitute for the order's historical country.
3. **Existing Ads geography is insufficient.** GeoStats contains Search only; Performance Max has no rows. Never allocate multi-country spend from campaign names.
4. **Historical campaign identity is incomplete.** The sheet omits campaign IDs; renames can share an ID, recreated campaigns cannot be silently merged.
5. **Revenue/refund definitions differ among references.**
6. **Source freshness varies substantially.** Ads/GA4: yesterday. Sheet: August. Shopify marts: July.
7. **Historical coverage differs.** Missing prior-year periods must show unavailable, not zero.
8. **Deployment setup is new.** Cloud Run disabled, DNS unconfigured.
9. **FX is reusable but not historically complete.**

## Decisions needed from the user

1. Hostname
2. Ads account scope
3. Migration boundary (Woo → Shopify)
4. Revenue contract (net merchandise vs order total, VAT, shipping, refunds)
5. Country rule (shipping → billing → Unknown)
6. GA4 scope and history
7. Access and integration
8. Operational defaults (EUR, Europe/Sofia, refresh time)

*These are definition/access questions, not a request to approve unfinished implementation.*
