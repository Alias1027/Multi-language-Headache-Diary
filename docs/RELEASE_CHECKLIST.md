# Release preparation — 0.6.1

Date: 2026-10-18. Target: **experimental source-available pre-release**. This file distinguishes locally checked engineering work from external validation and actual GitHub publication.

## Reproducible local gate

1. Run `npm test` with Node.js 24. Preserve the final result in [test-results.txt](test-results.txt).
   For UI changes, also run the optional `npm run test:browser` with separately installed Playwright/Chromium; see [VALIDATION.md](VALIDATION.md).
2. Run `npm run check:release`: source allowlist, secret/private-file checks, document versions, local Markdown links, cache version and offline resources.
3. Run `scripts/package.ps1` with a new destination. Verify `.github/` and `.env.example` survived the ZIP. Verify all source bytes and the SHA256 manifest, including rejection of extra files.
4. Start the extracted source with isolated synthetic data. Check health version, demo login, settings, report generation and the user-visible page. Stop the helper afterwards.
5. For a local portable update, stop the owned service, preserve data and keys, compare before/after decrypted-payload fingerprints, copy only release files, verify checksums, then start and confirm the version.
6. Inspect the final publish inputs manually. A pattern scanner cannot identify every kind of private content. Commit source only. A separately sanitized Windows x64 ZIP may be uploaded as a Release asset with its runtime and required third-party notices, but must exclude existing accounts, `data/`, keys, recordings, QA, backups and private environment variables. Never upload the active portable parent or machine-specific work logs. See [package selection](WINDOWS_PORTABLE.md).

## License and public description

The current project-authored release uses the custom [personal noncommercial source-available license](../LICENSE). **Junhui Liu M.D.** requires prior written permission for all institutional and commercial use. Requests: [junhuiliu1025@gmail.com](mailto:junhuiliu1025@gmail.com) or the official GitHub repository when published. See [LICENSING.md](LICENSING.md).

Third-party licenses are preserved. Rights already granted in older versions are not retroactively revoked. Review authorship, any prior distribution and external contributions before publication. This custom license has not had independent legal review. GitHub may display a custom license as “Other”; do not add an MIT/open-source badge to bypass that classification.

## Publication steps not performed locally

The [bilingual owner and participant checklist](RELEASE_PARTICIPATION.md) lists the remaining human tasks, synthetic usability exercises and feedback template. The [testing invitation](TEST_INVITATION.md) is ready to copy but has not been sent. The clean source and Windows x64 ZIPs are separate assets awaiting upload; no actual download URL or hosted CI success is implied.


- Create/select the actual repository; do not publish the whole Windows delivery folder.
- If importing an existing Git history, inspect that history for sensitive material and old licensing grants; current-tree checks do not scan all prior commits.
- Run the provided GitHub Actions matrix on Windows and Linux; resolve failures before tagging the release.
- Use `v0.6.1` as the application tag and mark the GitHub release as a pre-release. Use actual repository links in metadata only after they exist.
- Enable private vulnerability reporting where available. Do not collect patient data or credentials in public issues.

No remote GitHub CI run, repository publication, independent security audit, native clinical translation approval or patient study is asserted by completing the local gate. Actual local results and prior browser evidence are in [VALIDATION.md](VALIDATION.md).
