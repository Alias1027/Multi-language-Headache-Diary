# Changelog

## 0.7.0 — 2026-10-18

- Patient diary: encrypted multi-day queue and same-day amendments; ordered idempotent replay, account/session recovery, explicit conflict handling and storage/export guidance.
- Weak networks: cache-first static shell, finite request timeouts, no API caching or automatic write retries outside the diary queue.
- Mobile: opt-in exact-origin HTTPS reverse-proxy mode with Secure cookies, documented deployment and physical-device boundaries; default remains local.
- Eight-language offline messages; additional queue, network, security and browser regressions. No server clinical schema/rule change; existing data and0.6.1 assets preserved.


## 0.6.0 — 2026-10-17

- Circular microphone launcher with an always-visible 18px labels in all eight languages above the microphone icon, with generous space for longer translations and script-specific line heights, a generous touch target and a persistent recording indicator; existing voice workflow preserved.
- Patient-transcribed advice with explicit source, immutable amendments and separate clinician authorship.
- Actual start, subjective change, difficulty and adverse-effect feedback; descriptive 28-day diary observations with completeness.
- Per-field voice candidate review; conservative advice-versus-actual-use guard, no guessed missing dose/unit.
- Eight-language UI parity and expanded patient workflow tests. ASR remains optional interfaces only; no model/runtime bundled.
- Patient diary scope excludes full charts, automatic diagnosis, prescriptions and EHR/HIS writeback.

## 0.6.0 — 2026-10-17

- Protect unsaved reminder edits before other Settings forms/actions re-render the page; cancelling keeps the draft and does not submit another settings update.
- Keep the floating voice panel and close control within short/landscape viewports, with a usable scrolling body in all eight interface languages.
- Avoid rewriting encrypted profiles and vaults on idle scheduler ticks; scheduled delivery, retries, cancellation and reminder persistence remain covered.
- Add three scheduler regressions and an optional reproducible browser check: 40 voice layouts, eight language/report checks and two reminder workflows.
- Retain patient-controlled reminders as a documented feature highlight. All reminder channels remain local simulations. Schema and clinical statistical rules are unchanged.

## 0.5.2 — 2026-10-16

- Enlarge the persistent voice entry button to at least 64 pixels high on small screens and 68 pixels on larger screens, with stronger focus and touch affordance.
- Add eight-language reminder settings: weekdays, time zone, message language/content, channels, contact fields, quiet hours, pause dates and completed-day suppression.
- Add a server-side, local-only reminder simulator, explicit opt-in, per-day deduplication, bounded history, test throttling and version conflicts.
- Keep reminder contacts and history in encrypted private account metadata, outside clinician views, reports and clinical exports. Existing records are not migrated or rewritten on read.
- Reserve channel transport boundaries for email, SMS, Web Push, WeChat and Alipay. No external messaging provider is connected or enabled.
- Add 14 reminder regressions covering validation, timing, DST, privacy, authorization, multilingual rendering and restart deduplication.


## 0.5.1 — 2026-10-13

- Make optional model setup examples portable from a source checkout and refresh the current test count; separate local delivery files from GitHub publication materials.

- Expand English usage guidance and the Chinese README’s English overview; add eight matching 0.5.1 synthetic patient screenshots and capture provenance.

- Consolidate current documentation and English/Chinese README; remove private career discussion and the duplicate original Word report.
- Adopt the owner-confirmed personal noncommercial source-available license; institutional/commercial use requires written permission. Preserve third-party and previously granted rights.
- Add clean source packaging, version/link/privacy gates, SHA256 verification and regression tests.
- Centralize the application version; return a clear offline error rather than HTML for an uncached script. Clinical rules and existing records are unchanged.


## 0.5.0 — 2026-10-13

- Add Hindi and Urdu UI and report choices; share one language registry across client and server.
- Complete the eight parallel 554-key catalogs, including prior fallback guidance.
- Apply Hindi LTR and Urdu/Arabic RTL layout, script-appropriate font stacks, wrapping, numeric isolates and independent report direction. Preserve original free text and coded clinical data.
- Keep speech/extraction support explicitly Chinese/English; no Hindi, Urdu, Hinglish or Roman Urdu model has been enabled.
- Add six regression checks (89 total), full translation review matrix and localization scope documentation.


## 0.4.4 — 2026-10-12

- Automatically expose one medication form when acute use is Yes; untouched templates are excluded from submission and partial rows retain validation.
- Default new report language to the UI language, with an explicit fixed preference and per-report override. Use one period selector for custom dates, week, calendar month and rolling 28 days.
- Enlarge/highlight both role switches, remove the patient subtitle and prevention heading suffix, and reduce the save bar to its action button.
- Replace inline voice input with a fixed, collapsible panel and section shortcuts; use a separate scroll area and preserve drafts when minimized.
- Reserve opt-in server-side model adapters: OpenAI and Qwen audio transcription; OpenAI, DeepSeek, Doubao/Ark and Qwen text candidates. Retain the loopback ASR extension for independent protocols such as Doubao speech.
- Require per-request confirmation for configured external processing. Validate candidate fields/source quotes and revisions, retain provenance, and require human review before normal diary validation. No live keys, model installation or accuracy claims.
- 83 automated tests pass. See VALIDATION.md for browser checks and limitations.


## 0.4.3 — 2026-10-11

- Moved expanded overview before daily status and removed daily More details disclosure/title.
- Displayed an automatic first episode when headache is Yes, and a first preventive-regimen form. Untouched placeholders are excluded from counts/submissions; partial and existing records remain validated.
- Combined recording Start/Stop in one state-aware button; clarified and conditionally showed the separate new-note action.
- Reordered care buttons to assessment, simulated treatment plan, follow-up; selected editors remain visible without nested disclosure.
- Clarified calendar-month versus rolling four-week date presets in six languages.
- Added 3 template regression cases (71 total); verified synthetic browser entry, native required fields, date presets and care switching. No database migration or real ASR deployment.

## 0.4.2 — 2026-10-11

- Promoted episode details to an always-visible required clinical assessment with explicit missing/none/unknown answers and consistency checks.
- Expanded preventive-treatment and daily-impact assessment; require daily confirmation, allowing Not applicable without inventing a medication regimen.
- Unified, historical-edit and voice-filled submissions share validation at the UI and both APIs. Incomplete/contradictory batches do not partially save.
- Daily-impact summary separates no impact, limited/unable, unknown and unrecorded days; old stored payloads and report snapshots are not rewritten.
- Added 7 assessment regression cases (68 tests total), six-language labels and current documentation.


## 0.4.1 — 2026-10-11

- Applied patient-page annotations: daily/episode More details and voice input open by default; removed optional from More details.
- Required one or more pain-quality choices for each submitted episode, in both form variants and both write APIs. Missing choices retain the draft and show an inline prompt.
- Existing data preserved; 61 automated tests pass, including empty-quality rejection and atomic rollback on edits.


## 0.4.0 — 2026-10-11

- Replaced task-switching patient entry with a continuous conditional form, shared date, repeatable events and one save.
- Added atomic diary batch submission, immutable retry payload checks, offline queue recovery and cross-record date/status validation.
- Voice suggestions fill all matching sections in one reviewed action; dates/times remain manual. Existing audio retention/provider contract unchanged.
- Retained old drafts, history editing, clinical statistics, settings and care workflows. Added 8 batch regression tests (59 total).


## 0.3.0 — 2026-10-11

- Unified patient diary with in-page daily/episode/medication/voice tasks, merged timeline and ongoing-episode entry.
- Report-linked clinician assessments, follow-up scheduling/outcomes, simulated treatment-plan amendments and patient feedback.
- Server-enforced paired synthetic clinician identity, patient assignment, draft privacy, encrypted immutable care history, idempotency and conflict rejection.
- Settings groups and persistent sharing/care notices; compact report evidence with full print expansion.
- Nine additional automated care workflow/security scenarios and browser/mobile checks. Existing diary data, voice storage and clinical rules retained.


## 0.2.0 — 2026-10-10

- Chinese/English voice-assisted entry: original audio upload/recording UI, encrypted independent storage, playback/download/deletion, encrypted browser draft.
- Conservative text-to-field candidates with source evidence, mandatory review and manual date/time confirmation. Reported duration/frequency/response remain separate from calculated outcomes.
- Loopback ASR extension contract and optional CPU faster-whisper adapter example; model weights and real speech accuracy evaluation are not included.
- Voice access/quota/idempotency/encryption, transcription conflict and parser tests; Windows/browser verification detailed in VALIDATION.md.
- Package only the base Node runtime; optional ASR environments/models stay in the preparation directory on D:.

## 0.1.0 — 2026-10-10

- First runnable six-language local developer preview with separate report language and Arabic RTL.
- Daily status, episodes, medication response, preventive history, exposures, revisions and missingness-aware summaries.
- Synthetic fixture, public rule tests, encrypted persistence/offline queue, local email simulation and encrypted mock-clinic transfer with consent, receipts, corrections and retry demonstrations.
- Portable Windows runtime and launch/stop/test scripts; source-only open-source package and stage/validation documentation.
- Three mini-program web-entry scaffolds, explicitly not configured, platform-tested, approved or published.

No real patient study, external clinical integration, translation certification or GitHub publication occurred as part of this release.

## 0.6.1 — 2026-10-18

- Show every patient feedback entry with timestamp, provenance and plan-version association in eight languages; retain previous plans and amendment reasons.
- Include published plans, amendments, feedback, assessments and follow-ups in immutable clinician-summary snapshots, print and JSON downloads. Separate care-history scope from diary-statistics dates.
- Explain when an old report lacks the appendix or newer diary/care records require regeneration. Drafts and internal identities remain excluded; simulated sharing remains diary-only.
- Correct per-plan version numbering and display report feedback times in the report time zone.
- Add focused API/render and browser regressions; publish a primary-source product comparison and patient-diary release priorities. Speech models and real provider integrations remain optional interfaces.
