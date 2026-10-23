# Contributing — 0.8.2

Use synthetic data only. Do not submit patient identifiers, clinical exports, original patient audio, passwords, provider credentials or local databases. Describe a reproducible problem before proposing a change.

1. Read the [data dictionary](docs/DATA_DICTIONARY.md), [architecture](docs/ARCHITECTURE.md) and [security boundary](SECURITY.md).
2. For statistical changes, add meaningful boundary cases with independently specified expected results. Preserve denominators, unknown values, time zones, provenance and historical reports. Change the statistical rule version only when its contract changes.
3. UI labels live in eight catalogs under `public/locales/`, registered in `public/locale-registry.mjs`. Update all languages and the review matrices under `docs/`. Mark unreviewed translations honestly; do not manufacture reviewer names or approvals.
4. Run `npm test` and `npm run check:release` with Node.js 24. For UI changes, check small screens, Arabic/Urdu RTL, Hindi LTR, keyboard access and original-text preservation. Document what was actually tested.
5. Package a clean checkout with `scripts/package.ps1` and verify its manifest before a release. Keep runtime data outside source; do not bypass a release-gate failure by expanding its allowlist to include secrets.
6. Describe the user-visible change, evidence and remaining limits in the pull request. Separate mocked provider tests from live-provider evaluation. Record human and AI-assisted contributions accurately.

Clinical and translation review can begin with synthetic cases; independent reviewers and institutional partners have not been appointed. Use the repository's issue templates for reproducible bugs and non-sensitive review feedback. Follow [SECURITY.md](SECURITY.md) for sensitive reports.

## Contribution rights

The current source-available terms do not by themselves grant the maintainer a right to commercially relicense your original contributions. Before accepting external code, translations or documentation for inclusion, agree in writing on authorship and rights to distribute under the project license and to offer institutional/commercial licenses. No copyright assignment or contributor agreement is implied by opening an issue. Institutional contributors must obtain any required authorization from their organization. No external contribution agreement is currently executed or claimed.
