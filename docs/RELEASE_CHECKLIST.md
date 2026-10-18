# Release status and verification — 0.7.0


Updated: 2026-10-18. This checklist targets the **0.7.0 experimental source-available pre-release**: multi-day offline diary recording, bounded weak-network requests and an opt-in HTTPS deployment foundation. Version-specific test, publication and asset evidence belongs in [VALIDATION.md](VALIDATION.md). Historical 0.6.1 evidence below does not certify 0.7.0.

## Reproducible local gate

1. Run `npm test` with Node.js 24. Preserve the final result in [test-results.txt](test-results.txt).
   For UI changes, also run the browser suites with separately installed Playwright/Chromium, including `npm run test:offline-browser` for multi-day offline entries, reconnect and phone-sized layouts; see [VALIDATION.md](VALIDATION.md). Emulated viewports do not establish physical-device performance.
2. Run `npm run check:release`: source allowlist, secret/private-file checks, document versions, local Markdown links, cache version and offline resources.
3. Run `scripts/package.ps1` with a new destination. Verify `.github/` and `.env.example` survived the ZIP. Verify all source bytes and the SHA256 manifest, including rejection of extra files.
4. Start the extracted source with isolated synthetic data. Check health version, demo login, settings, report generation and the user-visible page. Stop the helper afterwards.
5. For a local portable update, stop the owned service, preserve data and keys, compare before/after decrypted-payload fingerprints, copy only release files, verify checksums, then start and confirm the version.
6. Inspect the final publish inputs manually. A pattern scanner cannot identify every kind of private content. Commit source only. A separately sanitized Windows x64 ZIP may be uploaded as a Release asset with its runtime and required third-party notices, but must exclude existing accounts, `data/`, keys, recordings, QA, backups and private environment variables. Never upload the active portable parent or machine-specific work logs. See [package selection](WINDOWS_PORTABLE.md).
7. Validate the exact 0.7.0 commit on both hosted platforms, publish only the matching sanitized source/portable/checksum assets, then download and verify those exact assets. Record the run and release links in [VALIDATION.md](VALIDATION.md). Do not reuse a prior version's green result or replace the frozen 0.6.1 assets.

## License and public description

The current project-authored release uses the custom [personal noncommercial source-available license](../LICENSE). **Junhui Liu M.D.** requires prior written permission for all institutional and commercial use. Requests: [junhuiliu1025@gmail.com](mailto:junhuiliu1025@gmail.com) or the [official GitHub repository](https://github.com/Alias1027/Multi-language-Headache-Diary--). See [LICENSING.md](LICENSING.md).

Third-party licenses are preserved. Rights already granted in older versions are not retroactively revoked. Authorship, prior distribution and external-contribution rights still need independent review. This custom license has not had independent legal review. GitHub may display a custom license as “Other”; do not add an MIT/open-source badge to bypass that classification.

## Historical verified publication: 0.6.1

- [x] The [official repository](https://github.com/Alias1027/Multi-language-Headache-Diary--) is public, and [v0.6.1](https://github.com/Alias1027/Multi-language-Headache-Diary--/releases/tag/v0.6.1) is published with the pre-release designation.
- [x] The release-tag commit `c1644cd` passed [GitHub Actions run 39118500923](https://github.com/Alias1027/Multi-language-Headache-Diary--/actions/runs/39118500923): 137 tests per platform on Ubuntu and Windows, release checks and source packaging/extraction verification.
- [x] The source ZIP, Windows x64 portable ZIP and `SHA256SUMS.txt` are available under Release Assets. All three downloads and SHA-256 values have been verified. The automatic GitHub source archives are different from the manually uploaded source ZIP.
- [x] The public [testing invitation](TEST_INVITATION.md) is included in the Release. This is not evidence that independent participants have been recruited or completed the tasks.

The `v0.6.1` tag, two ZIP assets and checksum file remain unchanged. The linked 137-test CI result belongs only to that release-tag commit. The 0.7.0 feature update requires its own validation, tag, assets and publication evidence; it is not merely a rewrite of the older release notes.

## Remaining human and external checks

The [bilingual owner and participant checklist](RELEASE_PARTICIPATION.md) contains synthetic usability tasks and a 0.7.0 feedback template. Independent user first-use testing, native-language and clinical review, security review and real-device acceptance remain pending. The 0.6.1 release's 101 browser checks were historical local synthetic checks, not a current hosted result.

- Confirm private vulnerability reporting where available; its repository setting has not been verified here. Do not collect patient data or credentials in public issues.
- If importing an existing Git history, inspect that history for sensitive material and old licensing grants; current-tree checks do not scan all prior commits.
- Preserve the source-only repository and sanitized assets; never upload the active Windows delivery folder, local records, recordings, keys, backups or QA files.
- Validate three-day offline use, browser/PWA restart, storage pressure, same-account recovery, mobile fonts/RTL and operating-system suspension on real devices. Deploy and verify the actual domain/certificate/proxy separately; the supplied configuration does not create a hosted mobile service. See [offline use](OFFLINE_MOBILE.md) and [deployment](MOBILE_DEPLOYMENT.md).

Automated success and publication do not establish clinical effectiveness, production readiness or deployment approval. See [VALIDATION.md](VALIDATION.md) for the evidence and its scope.
