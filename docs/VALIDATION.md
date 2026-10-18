# Validation record — 0.6.1

Date: 2026-10-18. Local environment: Windows x64, Node.js 24.19.0. Synthetic data only. Application 0.6.1, statistical rules 0.1.0, glossary 0.2.0, schema 1.

## Current automated results

**137/137 automated tests passed** on Windows / Node.js 24.19.0 (122 prior tests + 15 care-history, snapshot and report-rendering regressions), with zero failures, skips or cancellations. Full output: [test-results.txt](test-results.txt).

The suite covers clinical denominators and boundaries, missing/unknown answers, cross-midnight and overlapping events, civil dates/DST, medication days, response windows, revisions, atomic batch save, retries, role/ownership/CSRF checks, synthetic sharing, encrypted storage, voice provenance and mocked provider contracts.

Release regressions additionally cover exact source copying including dotfiles, exclusion of private parent data, rejection of sensitive source paths and symlinks, safe output boundaries, stale documentation and broken links, manifest tamper/extra/missing-file detection, HTTP delivery of all offline assets and service-worker cache boundaries. An uncached script now receives a 503 offline response instead of an HTML navigation fallback.

## Historical 0.5.1 packaged-source and browser smoke checks

The source ZIP was extracted into an isolated directory. All packaged source bytes, including `.github/` and `.env.example`, matched the input. The extracted server started independently, returned version 0.5.1, created a synthetic account, generated all eight report languages with unchanged values (8 headache days, 7 attacks, 5 acute-medication days, 82.1% coverage), switched patient/clinician roles and rejected the session after logout. The package manifest passed verification.

The 0.5.1 browser smoke review used the separate synthetic preview on localhost:8880. The patient page visibly showed 0.5.1, changing Hindi to Chinese preserved the restored synthetic draft, and the report button generated the expected summary. The inspected console error log was empty. The original 0.5.1 screenshot is retained in local historical backup material; it is not part of the current public gallery. This smoke check does not repeat the complete 0.5.0 language/device review.

## README gallery refresh — 2026-10-13

All eight patient overviews were recaptured from 0.5.1 using the same isolated synthetic case and the browser's existing 887 × 764 CSS-pixel viewport. The captures show identical statistical values for September 1–28, 2026: 8 headache days, 7 attacks, 5 acute-medication days, 23/28 recorded days and 82.1% coverage. Hindi used LTR, Arabic/Urdu used RTL, and no document-level horizontal overflow was observed at this viewport. The inspected console error log was empty. This was the historical 0.5.1 gallery refresh. Those images have been archived locally; the [current eight-language capture record](screenshots/README.md) and READMEs now show 0.6.1. This is a documentation and manual overview refresh; application code, clinical rules and saved patient records were not changed. It does not repeat the full historical device, forms or report workflow review.

## Prior user-interface evidence retained

The 0.5.0 review (2026-10-13) checked all eight report/settings interfaces and clinician editors using isolated synthetic accounts. Patient forms and the floating voice panel were inspected at 390×844. Hindi used LTR; Urdu/Arabic used RTL. No document-level overflow was observed in those inspected views. Original mixed-language draft text survived language switching, and an Urdu report retained its language after switching the surrounding interface. These are manual browser observations, not an automated end-to-end certification or native translation review.

The 0.4.4 review (2026-10-12) checked empty starter forms, combined save, the floating voice workflow, report-language choices, period selection and role switches with synthetic data. Model-provider tests used simulated responses and no live key. Earlier clinical boundary and HTTP regressions remain in the suite.

Selected historical screenshots are retained in local pre-update backups; `screenshots/` now contains the 0.6.1 gallery and care-workflow examples. 0.5.1 does not claim to have repeated every historical UI/device check.

## Pending validation

- Hosted GitHub Actions on Windows/Linux: workflow supplied, no remote run or publication performed by this local preparation.
- Independent clinical review, native clinical translation review, patient comprehension and usability studies.
- Real microphone/model accuracy, regional vendor availability and live-provider billing behavior.
- Full assistive-technology, print/PDF pagination, multi-device, performance and security audits.
- Real mailbox delivery, institution identity matching, hospital integration and mini-program platform/physical-device acceptance.
- Independent review of the custom license and contribution rights.

Automated pass counts are engineering evidence, not diagnostic accuracy, clinical effectiveness or a deployment approval. Reproduction steps and publication gates are in [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md).

## Reminder regression scope (0.5.2)

Fourteen added tests cover schedule validation, encrypted contact isolation, revision conflicts, per-day deduplication after reload, disabled/paused/missed schedules, overnight quiet hours, complete versus unknown daily states, diary/reminder time-zone differences, daylight-saving transitions, explicit test rate limiting, bounded failures/history, eight-language escaping, session/CSRF and clinician restrictions. Tests use disposable synthetic data. Provider delivery and patient adherence outcomes remain unvalidated.

## Historical 0.5.2 browser workflow

A separate synthetic database and fresh headless Chromium session exercised eight languages at 929 × 764 and 390 × 764 CSS pixels (16 combinations). It checked minimum voice-target dimensions, launcher/save/panel non-overlap, no document-level horizontal overflow and Hindi LTR versus Arabic/Urdu RTL. The reminder language initially followed each interface language. Saving a plan, generating a simulated test, viewing its history and reloading retained the settings. No page script errors were captured. These are engineering checks, not native-language review or patient usability evidence. Captures and measured results from this historical run are retained in private delivery QA. The public overview gallery was subsequently refreshed to 0.6.1.

## 0.5.3 debug and browser regressions

Three failures were reproduced before changing code: an unsaved reminder message disappeared after submitting language preferences without a warning; the voice panel started above the viewport at 844×320; and five idle scheduler ticks issued five SQLite writes. Their targeted reproductions passed after the fixes. The new scheduler tests also reload persisted jobs to verify delivery, retry recovery and expired/revoked consent cancellation.

The optional [browser regression script](../scripts/browser-check.mjs) passed **50 checks** in fresh headless Chrome with a disposable synthetic database: eight languages × five sizes (929×764, 390×764, 844×320, 390×400, 1440×500), eight report/settings checks, and two reminder workflows. It checks viewport bounds, reachable close controls, scrollable panel space, LTR/RTL and horizontal overflow; reports retain 8 headache days, 7 attacks and 5 acute-medication days. Settings cancellation preserves the unsaved message and sends no settings request; explicit discard, reminder save, local simulation and reload succeed. No page script errors were observed. These are browser-viewport checks, not physical-device certification.

Install Playwright separately for this optional check; no runtime dependency is added. Use **npm run test:browser** when Playwright is resolvable and its Chromium is installed. Alternatively set **PLAYWRIGHT_MODULE** to the absolute installed Playwright package directory and **BROWSER_EXECUTABLE** to a local Chromium/Chrome executable. Run **node scripts/browser-check.mjs evidence-directory** to retain synthetic screenshots and JSON results. It never opens existing user profiles, uses an ephemeral loopback port, and removes its temporary database on exit.

## 0.6.0 patient workflow verification

On 2026-10-17, all 122 automated tests passed with no failures or skips. Six additions cover patient authorship and immutable amendments, cross-account isolation, feedback dates and diary separation, old encrypted care rows remaining unchanged on read, observation denominators, advice versus actual medication in both deterministic/model candidates, and individual candidate rejection. The old-data test does not prove every possible future migration; local delivery backups and two-database restoration are separately checked in private QA.

The existing browser suite passed 50 checks. The [patient browser suite](../scripts/patient-browser-check.mjs) passed 21 checks: patient advice/source/feedback/observation; amendment preservation; clinician/patient separation; eight languages at 929px and 390px widths (16 checks); unchanged diary collections; and excluding a voice-derived dose/unit while leaving actual time blank. No page script errors or document-level overflow were observed. Chinese and Urdu captures were visually inspected. The public overview gallery has subsequently been refreshed to 0.6.1; historical images remain in local pre-update backups.

The standard delivery retains only speech interfaces and compatibility examples. A trial dependency download was cancelled at the user's request; no model weights were downloaded or ASR service enabled, and the temporary Python environment/cache were removed. No microphone, paid API, live model accuracy or clinical efficacy claim follows from these tests.

Reproduce the optional browser suites with `npm run test:browser` and `npm run test:patient-browser` after supplying Playwright; `PLAYWRIGHT_MODULE` and `BROWSER_EXECUTABLE` can point to an existing installation. Browser binaries are not bundled in the source ZIP.

## 0.6.1 history, report and publication verification

On 2026-10-18, all **137 automated tests** passed. New checks cover full feedback history, plan-kind isolation, escaping, legacy fields, published-only snapshots, immutable downloads, exclusion of clinician drafts and internal identities, account isolation, recursive-report prevention, unchanged sharing scope, independent plan-version chains and report time zones.

All **101 browser checks** passed: 50 existing general UI checks, 21 patient/voice workflows and 30 new care-history/report checks. The new [care browser suite](../scripts/care-browser-check.mjs) exercises actual UI submission of patient advice, repeated feedback, clinician confirmation and amendments; historical entries; JSON download; stale-report warnings; report regeneration; eight languages at 929/390/320 CSS pixels; RTL; print expansion/restoration; and unchanged actual diary data. No page script errors or document-level horizontal overflow were observed. Chinese and Urdu narrow-layout captures were inspected. The optional command is `npm run test:care-browser` with the same Playwright/Chromium environment described above.

The first full run exposed a cache-name/test mismatch and in-progress README versions. The final cache uses the exact release version, document metadata was synchronized, and the full suite passed. The review also corrected per-chain plan numbering and made feedback timestamps follow the report time zone. All browser tests use disposable synthetic databases; real mobile installation, clinical translation, efficacy, live ASR accuracy and external provider delivery remain unverified. The public gallery now contains 0.6.1 overview and care-workflow screenshots; older images are archived locally, without changing the historical test results above.

## 0.6.1 final release materials (2026-10-18)

The 137 core tests were rerun successfully for this packaging/documentation update. Twelve new screenshots were captured from isolated synthetic cases: eight consistent overview languages, plus Chinese/English feedback-history and report-appendix views. All eight overview values were checked as 8 headache days, 7 attacks, 5 acute-medication days and 82.1% coverage. Hindi used LTR; Arabic/Urdu used RTL. Every image was visually reviewed; the overview framing was revised to end after the complete overview card, excluding the unfinished form below. No application UI or clinical calculation was changed for the captures.

The current source gallery replaces older images; historical test conclusions above remain historical. The separate Windows x64 artifact includes a verified Node.js 24 runtime, its third-party license, launchers and device guides, without existing accounts, data, keys or recordings. Launcher and extracted-artifact first-use checks are engineering verification on the current Windows host; independent users, GitHub hosted CI and real-device acceptance remain pending in the [human checklist](RELEASE_PARTICIPATION.md). The invitation is prepared but has not been sent.

The first restricted-environment test attempt could not connect to temporary loopback test servers. The final core run was made with loopback access and passed; the environmental failure is not counted as a passing run. No real provider, clinical platform or patient data was used.

The Windows launcher harness passed 18 checks, including concurrent/repeated startup, Unicode/space paths, occupied-port rejection, PID ownership guards, legacy PID records without a port field, and preservation of SQLite table fingerprints and keys across stop/restart. The bundled Node.js v24.19.0 Windows x64 executable matches its official SHA-256 entry and has a valid OpenJS Foundation signature; this does not sign the project launch scripts.

