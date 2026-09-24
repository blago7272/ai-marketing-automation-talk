# Project contracts (docs/CONTRACTS.md, excerpt)

> Healthcare client reporting repository. Identifiers and client figures removed.
> *"These confirmed contracts are durable project memory. Read them before changing source precedence, campaign identity, currency conversion, or reporting comparisons."*

## Campaign identity

- Campaign identity and YoY joins use **account ID + campaign ID**; the latest available name is display-only.
- Do not merge recreated campaigns by similar names. Cross-account YoY requires a separately agreed explicit mapping.
- The legacy export does not include campaign channel type; label it unavailable, never infer PMax/Search from a name.

## Google Ads by country

- The pivot expands **Country → Campaign → Month**. Months sort newest first.
- Each level shows impressions, clicks, cost in EUR and conversion value in EUR.
- **Google Ads ROAS** = summed conversion value / summed cost in that row, two decimals. Missing inputs or zero cost show unavailable.
- A highlighted **Projected** current-month row appears above the **Actual** row: month-to-date ÷ completed days × days in month. Estimates never enter parent totals.
- Only project when the selection includes the month from its first day through the latest completed, geographically reconciled day.

## Access

- Both the Cloud Run IAP role and the application's signed-IAP email allowlist must include the authorised accounts. Deployment configuration must preserve all entries.
