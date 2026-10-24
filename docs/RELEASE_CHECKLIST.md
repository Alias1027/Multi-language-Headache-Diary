# Release status and verification — 0.8.2

<!-- release-target: 0.8.2 -->

Updated: 2026-10-23. This checklist targets **web/server 0.8.2 and Android 0.1.0-preview**. The [0.8.2 research pre-release](https://github.com/Alias1027/Multi-language-Headache-Diary--/releases/tag/v0.8.2) is public with four checked assets; [its hosted CI](https://github.com/Alias1027/Multi-language-Headache-Diary--/actions/runs/40021043776) passed. Android is not distributed through an app store. Historical CI remains version-specific. See [current release notes](RELEASE_NOTES_0.8.2.md), [validation evidence](VALIDATION.md) and [Android scope](ANDROID_OFFLINE.md).

**Physical-device acceptance is scheduled after the experimental pre-release, at the maintainer's request.** It is not a prerequisite for that limited release. Mark the package and release notes as **not yet physically device-validated** and invite synthetic-data testing; this does not make it a production or clinically validated release. Automated, packaging and data-preservation gates still apply.

## Publication verification steps for 0.8.2 (repeat for future versions)

1. Run npm test with Node.js 24 and save the final output in [test-results.txt](test-results.txt). Run relevant browser suites with isolated synthetic data, including multi-day offline/reconnect and patient/clinician permission tests. Record the exact revision and environment.
2. Run npm run check:release. Confirm current document versions, local links, source allowlist, private-file checks, cache resources and manifest rules. Historical version evidence must remain explicitly labeled.
3. Build the Android preview from the final source using the pinned Android toolchain. Verify the APK signature, package/version, non-debuggable release flag, permissions and first offline launch. CI should build without the maintainer's private signing key; a CI test APK is not the signed distribution APK.
4. Package the final source and a new Windows x64 portable bundle. Verify extracted bytes and manifests. Exercise the extracted portable's first start, synthetic entry, stop and restart with isolated data. Recheck the actual version served.
5. Preserve current data and keys before updating the local installation. Compare original records, account/permission relationships and keys afterwards. Never reset active stores to make tests pass.
6. Inspect all public inputs: source ZIP, sanitized Windows portable ZIP, signed Android APK and their SHA-256 values. Exclude existing accounts, data, keys, signing material, recordings, backups, QA and machine-specific logs. A scanner supplements manual inspection; it does not establish that every private value is absent.
7. Check hosted Ubuntu/Windows tests and Android build for the **exact final commit**. Link actual run results; do not reuse an earlier version's green badge or describe a workflow file as a completed hosted run.
8. Create a separate experimental pre-release and upload matching assets with the visible device-validation limitation. After publishing, download each asset again, verify its checksum and record the Release/run links. Preserve existing version tags and assets.

## After the experimental pre-release

Use the [bilingual participant checklist](RELEASE_PARTICIPATION.md). Physical-device and independent-user results remain unchecked until performed:

- Install on at least one real Android phone while offline; save consecutive days, restart and retain records.
- Verify a phone recorder's successful return, cancellation and file-picker fallback; confirm which original audio files are managed by the recorder.
- Export an encrypted backup and restore it on another phone with a different device key. Also test the wrong password, cancellation and preserved recovery point.
- Verify actual HTTPS account linking and the authorized clinician review → advice → patient feedback round trip; no public server is supplied by the source package.
- Check low memory, background suspension, low storage, longer offline use, clock/timezone changes, large fonts, screen readers and all eight languages.
- Verify mobile browser/PWA installation, restart, cache updates and pending-record recovery separately from the native Android app.
- Obtain independent native-language, clinical-rule, accessibility and security review before making broader claims.

These deferred tasks must not be silently relabeled as completed. Synthetic/emulator checks are engineering evidence, not clinical effectiveness or production certification.

## License and public description

The current project-authored release uses the custom [personal noncommercial source-available license](../LICENSE). **Junhui Liu M.D.** requires prior written permission for all institutional and commercial use. Requests: [junhuiliu1025@gmail.com](mailto:junhuiliu1025@gmail.com) or the [official repository](https://github.com/Alias1027/Multi-language-Headache-Diary--). See [LICENSING.md](LICENSING.md).

Preserve third-party notices. Rights granted by older versions are not retroactively revoked. Authorship, external-contribution rights and the custom license have not had independent legal review. Do not use an MIT or OSI-open-source badge for this source-available release. If importing old Git history, separately inspect its private contents and previous licensing grants.

## Historical publication evidence — earlier versions

The [v0.6.1 pre-release](https://github.com/Alias1027/Multi-language-Headache-Diary--/releases/tag/v0.6.1) and [v0.7.0 pre-release](https://github.com/Alias1027/Multi-language-Headache-Diary--/releases/tag/v0.7.0) are earlier versions. The 0.6.1 release-tag commit c1644cd passed [run 39118500923](https://github.com/Alias1027/Multi-language-Headache-Diary--/actions/runs/39118500923), including 137 tests on each hosted platform. Its source/portable/checksum downloads were previously verified. These historical results do not substitute for the [0.8.2 tagged-commit run](https://github.com/Alias1027/Multi-language-Headache-Diary--/actions/runs/40021043776), its four release assets or physical-device acceptance.

Confirm repository private vulnerability reporting where available; a document cannot verify a setting. Do not collect patient data, recordings, passwords or keys in public issues.
