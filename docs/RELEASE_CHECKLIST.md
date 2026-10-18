# Release status and verification — 0.6.1

Updated: 2026-10-18. Status: **published experimental source-available pre-release**. This file distinguishes verified publication and engineering checks from external validation still pending.

## Reproducible local gate

1. Run `npm test` with Node.js 24. Preserve the final result in [test-results.txt](test-results.txt).
   For UI changes, also run the optional `npm run test:browser` with separately installed Playwright/Chromium; see [VALIDATION.md](VALIDATION.md).
2. Run `npm run check:release`: source allowlist, secret/private-file checks, document versions, local Markdown links, cache version and offline resources.
3. Run `scripts/package.ps1` with a new destination. Verify `.github/` and `.env.example` survived the ZIP. Verify all source bytes and the SHA256 manifest, including rejection of extra files.
4. Start the extracted source with isolated synthetic data. Check health version, demo login, settings, report generation and the user-visible page. Stop the helper afterwards.
5. For a local portable update, stop the owned service, preserve data and keys, compare before/after decrypted-payload fingerprints, copy only release files, verify checksums, then start and confirm the version.
6. Inspect the final publish inputs manually. A pattern scanner cannot identify every kind of private content. Commit source only. A separately sanitized Windows x64 ZIP may be uploaded as a Release asset with its runtime and required third-party notices, but must exclude existing accounts, `data/`, keys, recordings, QA, backups and private environment variables. Never upload the active portable parent or machine-specific work logs. See [package selection](WINDOWS_PORTABLE.md).

## License and public description

The current project-authored release uses the custom [personal noncommercial source-available license](../LICENSE). **Junhui Liu M.D.** requires prior written permission for all institutional and commercial use. Requests: [junhuiliu1025@gmail.com](mailto:junhuiliu1025@gmail.com) or the [official GitHub repository](https://github.com/Alias1027/Multi-language-Headache-Diary--). See [LICENSING.md](LICENSING.md).

Third-party licenses are preserved. Rights already granted in older versions are not retroactively revoked. Authorship, prior distribution and external-contribution rights still need independent review. This custom license has not had independent legal review. GitHub may display a custom license as “Other”; do not add an MIT/open-source badge to bypass that classification.

## Verified publication status

- [x] The [official repository](https://github.com/Alias1027/Multi-language-Headache-Diary--) is public, and [v0.6.1](https://github.com/Alias1027/Multi-language-Headache-Diary--/releases/tag/v0.6.1) is published with the pre-release designation.
- [x] The release-tag commit `c1644cd` passed [GitHub Actions run 39118500923](https://github.com/Alias1027/Multi-language-Headache-Diary--/actions/runs/39118500923): 137 tests per platform on Ubuntu and Windows, release checks and source packaging/extraction verification.
- [x] The source ZIP, Windows x64 portable ZIP and `SHA256SUMS.txt` are available under Release Assets. All three downloads and SHA-256 values have been verified. The automatic GitHub source archives are different from the manually uploaded source ZIP.
- [x] The public [testing invitation](TEST_INVITATION.md) is included in the Release. This is not evidence that independent participants have been recruited or completed the tasks.

The main-branch documentation is updated after publication. The `v0.6.1` tag, two ZIP assets and checksum file are unchanged; current online documentation supersedes older publication-status wording inside the frozen packages. Future source changes need their own validation; the linked CI result belongs to the release-tag commit.

## Remaining human and external checks

The [bilingual owner and participant checklist](RELEASE_PARTICIPATION.md) contains synthetic usability tasks and a feedback template. Independent user first-use testing, native-language and clinical review, security review and real-device acceptance remain pending. The previous 101 browser checks were local synthetic checks, not part of the hosted CI run.

- Confirm private vulnerability reporting where available; its repository setting has not been verified here. Do not collect patient data or credentials in public issues.
- If importing an existing Git history, inspect that history for sensitive material and old licensing grants; current-tree checks do not scan all prior commits.
- Preserve the source-only repository and sanitized assets; never upload the active Windows delivery folder, local records, recordings, keys, backups or QA files.

Automated success and publication do not establish clinical effectiveness, production readiness or deployment approval. See [VALIDATION.md](VALIDATION.md) for the evidence and its scope.
