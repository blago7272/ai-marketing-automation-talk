# Project operating rules (AGENTS.md)

> Excerpt from the healthcare client reporting repository. Project and account identifiers removed.

- Read `docs/discovery-2026-09-22.md` before implementation. Discovery findings are observations, and proposed decisions remain provisional until resolved with the user.
- Do not modify any reference repository. Keep implementation in this repository and explicitly scoped new cloud resources.
- Deploy the reporting project to the client's reporting project; never inherit another project's active cloud CLI configuration.
- Do not commit secrets, credentials, customer-level extracts, or generated artifacts. Keep the repository clean and sync meaningful milestones with Git.
- Preserve source provenance and source-specific metrics. **Never add Shopify revenue to Google Ads or GA4 attributed revenue.**
- Prevent duplicate facts across Sheets, Shopify, and Ads transfer data. Resolve campaign names by account and campaign ID; do not infer historical IDs from ambiguous names.
- Reconcile country-level Ads totals against account/campaign totals, including Performance Max, before treating a country report as complete.
- Report source freshness and coverage explicitly. **Missing data is not zero**; partial periods must have comparable YoY windows.
- Read `docs/CONTRACTS.md` as durable project memory.

## Why this file matters

Every new agent session starts by reading these rules. Decisions made on day one (revenue definition, migration boundary, source precedence) survive into day two without being re-explained.
