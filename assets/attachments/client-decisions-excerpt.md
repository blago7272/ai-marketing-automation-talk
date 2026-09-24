# Confirmed direction (docs/decisions.md, excerpt)

> Healthcare client reporting repository, updated 22 September 2026. Hostnames, emails, project and account IDs removed.
> *"This document supersedes the corresponding open questions in the initial discovery report."*

## User decisions

- Hostname: the client's reporting subdomain.
- Deployment project: the client's own reporting project.
- Google Ads source: the existing generic DTS export.
- Include both **net merchandise revenue** and **order total**. Preserve the historical sheet revenue as a reconciliation control.
- Shopify boundary: **29 April 2026**. Earlier orders were imported from WooCommerce semi-manually. Keep source precedence simple; do not introduce elaborate migration inference.
- Build a client index, following an earlier client's index pattern, linking to the mixed Shopify/GA4/Ads report and to the existing detailed Google Ads dashboard.
- Access follows a Google-account allowlist model.
- Reference repositories remain read-only.
- Revenue eligibility: payment received only; exclude test orders and retain refunded orders with their adjustments.
- Refund/return adjustments belong to the original order date, confirmed on 22 September 2026.
