# Validation record — 0.7.0

Date: 2026-10-18. Local environment: Windows x64, Node.js 24.19.0, headless Chrome. Synthetic data only. Application 0.7.0; statistical rules 0.1.0, glossary 0.2.0 and schema 1 are unchanged.

## Current 0.7.0 results

**169/169 automated tests passed**, with zero failures, skips or cancellations. Full output: [test-results.txt](test-results.txt). **125 browser checks passed**: 50 general UI, 21 patient/voice, 30 care/history/report and 24 offline/mobile/weak-network checks, with no page JavaScript errors. Existing clinical denominators, revisions, permissions, care history, voice review and publication boundaries remain covered.

The offline browser suite verifies multiple dates and same-day amendments; encrypted recovery after a full browser restart; stable-ID replay after a lost acknowledgment; bounded hanging requests; session expiry and same-account reauthentication; account isolation; conflict retention; concurrent tabs; simulated quota exhaustion; retained unsubmitted drafts; and logout protection across tabs. It checks all 36 service-worker assets and clears the HTTP cache before reopening offline, so ordinary disk cache cannot mask missing offline resources. Eight languages were inspected at 390 CSS pixels, including Arabic/Urdu RTL; French and Urdu draft-recovery controls were also checked.

The weak-network simulation retained a pending save after approximately 12.5 seconds. An already cached stylesheet returned in approximately 3 milliseconds despite a simulated 7-second server delay. These measurements describe this isolated test, not a universal device/network performance guarantee.

The opt-in HTTPS-proxy tests validate origin/host/header contracts, secure cookies and client-IP rate limiting while keeping Node bound to loopback. A real public domain, TLS deployment and physical phone were not used. Email identity and all external reminder channels remain simulations; this does not certify an operational clinical service.

Debugging reproduced and fixed: whole-page background refresh replacing unsaved forms; a shared cross-tab draft key losing another draft; sign-out clearing unsubmitted drafts; and a missing new module in the offline cache. The cache regression was exposed by both the source audit and the strengthened cold-restart browser test. Restricted-environment loopback failures were rerun with local-network access; they are not counted as passes.

The local upgrade uses a verified consistent backup of both existing databases and encryption material, then compares every table and retained file after restart. Those private preservation records remain outside the public source package. Prepared source/portable ZIPs are independently checked; launcher/first-use and uploaded-asset results are recorded with the Release and local delivery evidence.

**18/18 Windows launcher checks and 6/6 extracted-package first-use checks passed.** The launcher checks cover clean startup, repeated and concurrent startup, PID ownership, occupied-port rejection, safe stopping and restart preservation. First use checks the package manifest, patient record creation/revision, browser reload, report download and retained data after stopping/restarting. The test harness was corrected to bound its own launcher-process wait, verify the unrelated TCP listener with a real connection, and read the bundle version dynamically; these were harness corrections, with no product-launcher change.

**中文：Windows启动器18/18项、解压包首次使用6/6项检查通过。** 检查包括全新启动、重复及并发启动、进程归属、端口占用保护、安全停止、重启保留，以及校验文件、患者记录与修订、浏览器重载、报告下载。测试脚本修正了等待后台子进程造成的卡住、端口断言兼容性及旧版本号写死问题；产品启动器未因此修改。这些仍是本机合成数据检查，不替代独立用户或真机测试。

## Reproduce and interpret

- `npm test` and `npm run check:release` cover core behavior and source boundaries.
- Optional Playwright suites: `npm run test:browser`, `npm run test:patient-browser`, `npm run test:care-browser`, `npm run test:offline-browser`.
- GitHub Actions runs core and release checks on Ubuntu and Windows, plus the offline browser suite on Ubuntu. Consult the [version's Release](https://github.com/Alias1027/Multi-language-Headache-Diary--/releases/tag/v0.7.0) and [Actions](https://github.com/Alias1027/Multi-language-Headache-Diary--/actions) for the actual remote commit and result; local success does not imply hosted CI success.
- True Android/iOS browser and installed-PWA acceptance, low-memory/storage eviction, multi-day real disconnection, background lifecycle, native-language comprehension, accessibility, security, live model/provider accuracy and clinical benefit remain unverified. See [the human checklist](OFFLINE_MOBILE.md) and [deployment boundary](MOBILE_DEPLOYMENT.md).

中文：本轮169项核心测试、125项合成数据浏览器检查通过。浏览器冷启动前清除普通HTTP缓存，确认离线资源和记录可以恢复；修复多标签草稿、后台同步及退出保护问题。真实手机、持续多日实际断网、低内存/存储回收、公网HTTPS部署、母语审校、无障碍和临床效果仍需单独验证。下文0.6.1及更早结果为历史记录，不冒充本轮结果。

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

- Hosted GitHub Actions and publication have since been verified for v0.6.1; see the dated publication verification below. They are no longer pending items.
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

The current source gallery replaces older images; historical test conclusions above remain historical. The separate Windows x64 artifact includes a verified Node.js 24 runtime, its third-party license, launchers and device guides, without existing accounts, data, keys or recordings. Launcher and extracted-artifact first-use checks are engineering verification on the current Windows host; independent user testing and real-device acceptance remain pending in the [human checklist](RELEASE_PARTICIPATION.md). Hosted CI and publication were subsequently verified as recorded below. The invitation is now publicly included in the Release; independent participation or completed testing has not been verified.

The first restricted-environment test attempt could not connect to temporary loopback test servers. The final core run was made with loopback access and passed; the environmental failure is not counted as a passing run. No real provider, clinical platform or patient data was used.

## 0.6.1 GitHub publication verification (2026-10-18)

The [official repository](https://github.com/Alias1027/Multi-language-Headache-Diary--) and [v0.6.1 research pre-release](https://github.com/Alias1027/Multi-language-Headache-Diary--/releases/tag/v0.6.1) are public. [GitHub Actions run 39118500923](https://github.com/Alias1027/Multi-language-Headache-Diary--/actions/runs/39118500923) passed for the release-tag commit `c1644cd8ca4767b20abc551167de6a33fadd2175`: **137 tests passed on Ubuntu and 137 on Windows**, together with release checks and source packaging/extraction verification. The previously recorded **101 browser checks were local synthetic checks**; they are not claimed as hosted CI results or as a new run during this documentation update.

All three uploaded Release assets were downloaded successfully and their SHA-256 values verified against the local release evidence:

| Asset | Bytes | SHA-256 |
| --- | ---: | --- |
| `headache-diary-source-0.6.1.zip` | 1582723 | `9b9336488d5030e8c929f049808d6469da612bac5640b98c3a4b88eb5fb9d699` |
| `headache-diary-windows-x64-0.6.1.zip` | 36327762 | `3d09f4ed3e9ebdbb9f363113620ab8224cdbcd594e2a3184944acc03f812bd47` |
| `SHA256SUMS.txt` | 203 | `ba39662a84e2b009ffe084db3da566a252131506109747500fef8a2af60fdf6a` |

The Release remains a pre-release. Its title, tag and assets were preserved when the bilingual publication wording was updated. The main-branch documentation now records the published status; the frozen `v0.6.1` tag and ZIPs are not replaced. Current online documentation supersedes older publication-status wording inside those packages. These results apply to the named commit and artifacts, not automatically to future main-branch changes.

已核验公开仓库、v0.6.1实验预发布版、Ubuntu与Windows各137项自动测试及发布／打包检查，并重新下载三个附件核对SHA-256。此前101项浏览器检查仍属于本机合成验证。公开测试邀请已随Release提供，独立用户参与、母语审校、临床验证、安全审查及手机/PWA/小程序真机验收仍待完成；应用服务未因此部署公网。main文档为发布后状态同步，标签和冻结附件保持不变，包内较早的发布状态以当前在线说明为准。

The Windows launcher harness passed 18 checks, including concurrent/repeated startup, Unicode/space paths, occupied-port rejection, PID ownership guards, legacy PID records without a port field, and preservation of SQLite table fingerprints and keys across stop/restart. The bundled Node.js v24.19.0 Windows x64 executable matches its official SHA-256 entry and has a valid OpenJS Foundation signature; this does not sign the project launch scripts.

