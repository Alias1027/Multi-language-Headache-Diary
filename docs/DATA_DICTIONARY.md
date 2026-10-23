# Data dictionary and statistical contract — 0.8.2

## Assessment extension introduced in 0.4.2

Daily writes now require explicit `preventiveTaken` and `dailyImpact=none/limited/unable/unknown`, saved with `dayAssessmentVersion=1`. New forms start unanswered. Not applicable is a valid preventive-use response; no automatic regimen or dose is created.

Episode writes require `durationStatus=from_times/reported/ongoing/unknown`, `frequencyStatus=reported/unknown`, `symptomsStatus=present/none/unknown` and `triggersStatus=present/none/unknown`, saved with `assessmentVersion=1`. The status/detail pair must be consistent. Reported duration requires a positive value, from_times requires an end after start, and ongoing requires a null end and ongoing endStatus. Reported frequency requires nonblank text. Explicit unknown cannot coexist with a reported numeric duration or frequency text. Positive symptoms/triggers require nonempty corresponding code lists; none/unknown require empty lists. Impact, precision and type must be explicit. Notes may be blank.

Missing status fields in legacy records mean unanswered, never none. Existing records/reports are not migrated; edits must complete current requirements. Legacy positive detail lists or an existing duration/frequency can populate the matching positive answer for review. Voice candidates without these details do not fill a negative or unknown answer.

New `summary.dailyImpact` counts eligible complete days for none/limited/unable/unknown; `unanswered` counts eligible days with no accepted daily-impact answer, including absent daily entries and legacy records. These categories sum to eligibleDays. Episode impact remains a separate statistic. Statistical counting rules remain 0.1.0. The glossary is 0.2.0; the application release is independent of those versions.


Schema 1; statistical rule version 0.1.0; glossary version 0.2.0. Intended for review, not a claim of clinically adjudicated definitions. Clinical reviewer: **pending**.

## Shared record fields

`id`: stable client-generated string; `revision`: integer, starts at 1 on first save. Incoming revision is the version being edited (0 on creation). A mismatch yields HTTP 409. `operationId`: unique mutation ID; a replay returns duplicate without adding a record or revision. IDs are ASCII alphanumeric, `_` and `-`, max 100 characters. `createdAt` and `updatedAt` are server UTC times. `notes` preserves original text, max 2,000 characters; no translation or diagnosis extraction.

| Entity | Fields and meaning |
|---|---|
| Vault | observation start `enrolled`; locked IANA `timezone`; UI `language`; independent `reportLanguage`; `synthetic` marker; source `revision`; record collections |
| Daily status | unique civil `date`; `headache` and `acute` each `yes/no/unknown`; `migraine` patient self-report only; `migraineSource=patient`; `preventiveTaken=yes/no/not_applicable/unknown`; exposure codes; `exposuresComplete`; late entry flag |
| Episode | ISO8601 `start`, nullable `end`; `endStatus=ended/ongoing/unknown`; `intensity=0..10/null`; multi-select location, quality, symptoms and suspected triggers; functional `impact=none/limited/unable/unknown`; time `precision=exact/estimated`; original device timezone; `type=attack/background/exacerbation` |
| Acute medication | generic/free-text `name`; positive numeric `dose`; explicit `unit=mg/mcg/mL/tablet/spray/other`; class code; ISO `at`; nullable pre-dose pain; optional follow-up actual time, pain-free yes/no/unknown, function recovery yes/no/unknown; rescue flag; recurrence no/24h/48h/unknown; adverse effects text |
| Preventive | free-text name and regimen; start and optional stop civil date; adjustment/stop reason; adverse effects. End old regimen and create a new entry for an adjustment. Revisions correct errors. |
| Mock-hospital sharing consent | immutable grant ID; institution `mock-clinic`; active flag; summary/details scope; weekly/monthly frequency; UTC expiry; grant time; research=false. Separate from clinician access permission below. |
| Report | immutable snapshot ID/version, source revision, language, generated UTC time, rule/glossary versions, current and previous equal-length summaries |
| Transfer | stable ID, source revision, consent ID and scope, immutable encrypted report/detail snapshot, attempts, state, retry time, receipt |

Concept enumerations are authoritative in `public/domain.mjs:CODES`. Display labels are in `public/i18n.mjs`. Laterality always means the patient's left/right, including in Arabic. Manual free-text medicine names are not automatically classified; the optional voice parser proposes a class only for a small explicit generic-name dictionary and requires review; “other” is a legitimate unknown classification. A unit of “other” needs clarification in notes. No standardized medication terminology service is connected.

For legacy fields outside the new explicit assessment extension, `unknown` covers not known and not entered. Refusal/reason-for-missing is not separately implemented in v0.1.0; do not infer refusal from blank fields. Zero pain, no symptoms and unknown are distinct. No diary deletion/tombstone UI is available; diary revisions are retained. Separate voice notes can be logically deleted.

## Time and denominator rules

1. Civil dates are interpreted in the vault's locked report timezone. Event timestamps retain offset-normalized UTC and original device timezone. Form inputs explicitly use the device timezone.
2. Report input dates are inclusive; time intervals use `[start, next-day-after-end)`. Episode end is excluded. Exact midnight therefore does not occupy the next date. Duration uses UTC elapsed milliseconds, including DST changes.
3. Only complete dates from enrolment through yesterday enter summary metrics and coverage. Future/pre-enrolment/current dates are excluded. Selected dates, eligible count and exclusions remain in JSON. Maximum selected span: 732 inclusive dates.
4. Daily-status denominator is eligible complete dates. Numerator is explicit yes/no status only. Unknown count is denominator minus numerator. Inference never silently fills that status series.
5. Headache-day count is the union of daily yes and dated episode evidence. Episode-derived dates without a known daily status are listed. An explicit no plus overlapping episode remains a visible conflict; it is counted as headache evidence, not adjudicated away. `clinicalKnownDays` counts explicit status or episode evidence and is separate from diary completion.
6. Ongoing episodes provide evidence through the report cutoff/current instant, but never a final duration. Unknown-end episodes provide evidence only on their known start date; later dates are not invented. This conservative handling is a design decision requiring clinical review.
7. New episodes start inside the eligible interval. Carried-in episodes overlap but start earlier; count separately. Background/exacerbation entries are included in the episode count with no automatic splitting or merging; do not interpret all entries as discrete migraine attacks.
8. Completed durations include each full completed episode, while `completedUnionMinutes` clips completed episodes to the report period and unions overlaps. This is not total true pain time when ongoing/unknown episodes exist. Both sources remain in JSON.
9. Acute-medication days union explicit daily yes with event dates. Known acute status unions explicit yes/no with event dates. Negative daily medication status with an event is a conflict. Per-class days are distinct dates in each class; class counts must not be added as total days.
10. For optional two-hour follow-up, experimental acceptable window is 90–150 minutes inclusive after dose. Missing/unknown responses and outside-window responses are separate. This tolerance is a project rule, not an assertion that a guideline mandates it. In-window “no pain” / in-window known response is descriptive; missing is neither success nor failure.
11. Daily late entry means first saved on a later civil date than its event date, not a later correction. Precision and revisions remain visible in data. A positive interval with an estimated start is still counted using entered times and must be interpreted with that uncertainty.
12. Week: Monday–Sunday, most recently completed. Month: previous natural month. 28-day window: last 28 complete dates. Previous comparison is equal number of selected dates immediately before current start; display its own eligibility/coverage and do not imply treatment causality.
13. Migraine-day count uses only patient self-report and is labelled accordingly. No rule-derived or clinician-confirmed diagnosis is fabricated.
14. Preventive adherence records yes/no/not-applicable/unknown. Report ratio is yes / (yes + no) among eligible daily observations, not a pill count or proof of adherence; JSON includes unknown count. Regimen timeline may be incomplete.

## Expected synthetic September window

September 1–28, Asia/Shanghai: 23/28 explicit daily statuses, coverage82.1%; headache days8; unknown5; episodes7; acute days5; known acute status21/28; late daily entries4; max/mean intensity8/6.3; completed union1140minutes; in-window response4, pain-free3, missing1. Names/doses are illustrative and are not treatment recommendations.

Fixtures and expected outputs are in `fixtures/`. Reproduce with `node scripts/generate-fixtures.mjs`. Boundary and security assertions are in `tests/`, keyed to work-report T01–T15. Translation equality checks do not replace human understanding tests.


## v0.2.0 voice extension (statistics rule version unchanged)

- Optional shared fields `sourceVoiceId` and positive integer `sourceVoiceRevision` link a confirmed form to an owned voice note. Unchanged links survive later audio deletion when editing an existing diary entry; new links require an existing matching note revision.
- Episode `reportedDurationMinutes`: nullable positive number ≤43200, self-reported only, never substituted for timestamps or completed union duration. `reportedFrequency`: ≤250 characters, not observed diary frequency.
- Medication `responseNote`: ≤500 characters, narrative only; not a two-hour outcome without a separately entered follow-up.
- Voice notes are a separate encrypted collection: ID, language zh/en, original MIME/byte length/SHA-256/audio, first and latest ASR text/model metadata, editable text ≤5000, revision and timestamps. Corrections retain the latest editable text, not a complete transcript revision archive.
- Form notes copy at most2000 characters; full independent transcript remains in the voice note until edited/deleted. Raw audio and independent transcript notes are excluded from ordinary diary/FHIR exports and hospital sharing. Confirmed fields/notes are treated like other diary records.


## v0.3.0 Clinical follow-up records

Clinical care records are separate from the daily/episode/medication/preventive diary collections. All records carry server-issued IDs, author identity and creation/update times. A care revision records each change.

| Kind | Required meaning | Key boundaries |
|---|---|---|
| assessment | report ID/snapshot, summary, draft or confirmed; optional response, function, questions, patient message | Report source revision is preserved. Confirmed entries require a new amendment with previous ID and reason. |
| followup | due date, method, focus, status; actual completion time/outcome for completed visits | Draft, scheduled, completed, unreachable, postponed, cancelled are distinct. Published entries cannot return to draft. |
| plan | medication/name, action, effective dates, manual dose/route/frequency, reason and instructions | Confirmed plans require complete manual fields except dose fields for stopping. Synthetic-patient plans carry `simulated=true`; other clinician-entered advice has distinct provenance. Neither is an electronic prescription or proof of actual use. Amendments preserve old versions. |
| feedback | confirmed plan ID, read/started/not_started/difficulty, optional note | Patient-authored report; never treated as a medication event, dose, or evidence of adherence. |

Any later diary revision currently marks an assessment as potentially stale, even when outside its observation window. This conservative flag requires review and does not rewrite the assessment. Free text is stored as entered, escaped for display, and never clinically reinterpreted or automatically translated.

## 0.4.0 grouping

A unified submission is an input convenience, not a new clinical event type: one day record plus zero or more episodes, actual doses and preventive regimen changes. Original kinds, revisions, unknowns and timestamps retain their meaning. A source voice note may link several records. Exact-payload replay metadata is internal and excluded from exports.

## 0.4.1 episode completeness

On episode writes, quality must contain at least one valid CODES.quality value. No default quality is inferred. Existing stored records remain readable; edits must meet the new requirement. Daily status records remain a separate record kind.

## 0.6.0 Patient advice and observation

- `patientPlans`: patient-only writes; server-assigned `source=patient_reported`, `status=recorded`, author and timestamps. Name/advice and `sourceNote` are required. Dose/route/frequency/start/end may remain unknown. `observationFocus` and `reviewDate` are optional. Amendments require previous ID and reason; originals remain immutable and competing successors are rejected.
- Confirmed clinician plans optionally carry `observationFocus` and `reviewDate`; synthetic records remain marked as simulated. Patient transcription never gains clinician confirmation automatically.
- Feedback references `planKind` (`plans` or `patientPlans`, legacy default `plans`) plus plan ID. Only current, published advice accepts new feedback. `actualStart` is a valid nonfuture date or null; read/not_started cannot carry an actual start. `perceivedChange` is not_assessed/better/same/worse/uncertain. `difficultyReason` is none/forgot/unavailable/side_effects/unclear/other and is populated only for difficulty. `adverseNote` and note retain patient text. Feedback does not modify any diary collection.
- The latest feedback's actual start anchors equal calendar windows, each 28 days. Existing `summarize` complete-day and enrollment rules determine eligible denominators. Coverage differs when there are missing or not-yet-complete days. Counts are observations, not causal treatment-response estimates. Cards summarize the latest feedback and provide per-entry history; all feedback records remain in JSON export.
- Existing encrypted care rows normalize `patientPlans=[]` in memory. No bulk data rewrite or diary rule migration is required.

## Care report snapshot (0.6.1)

Manually generated reports add `careSummary` with `schemaVersion: 1`, `scope: published-history-as-of-generation`, `capturedAt`, and `sourceRevision` for the separate care collection. Scalar whitelisted fields cover published `plans` (including patientPlans with explicit kind/provenance), immutable predecessors/reasons, all linked `feedback`, confirmed `assessments`, and non-draft `followups`. Internal actor identifiers, operation/history objects, drafts and nested assessment reports are excluded. Plan IDs and kinds bind feedback to one version; free text remains in its original language.

The appendix covers all published history available at generation; `summary.from/to` only filters diary statistics. Missing `careSummary` in an old report is displayed as unavailable, not zero feedback. Reports are immutable after creation. This is additive and does not change diary schema 1, rule 0.1.0 or glossary 0.2.0. Existing simulated sharing does not inherit this appendix without a future explicit consent/schema extension. Repeated reports retain their own copies; storage deduplication is a future optimization, never an automatic deletion of historical evidence.

## Current clinician access and review (introduced in 0.8.0)

Clinician accounts use an independent role, password and session. Operator approval and an active, expiring patient grant are both required for patient-specific requests. The clinician connection code identifies an account; it is not itself an access token or a medical license. Revocation or reissuing a grant does not reuse a previous review.

Separate encrypted `care_grants` and `care_reviews` records bind the permitted patient/clinician, expiry, grant identity, reviewer, dated report, diary revision and patient advice/feedback state. Confirmation requires a current review; patient-side changes or grant changes make earlier review evidence stale. Saved clinician records retain `reviewedAt`, `reviewId` and `reviewedReportId`. Only the author can edit/view their private drafts; confirmed advice is amended without overwriting its predecessor.

New clinician records use `provenance=simulated_clinician` for synthetic patients and `clinician_entered` otherwise; patient transcription and feedback remain `patient_reported`. Legacy records retain their original simulation provenance. These source labels identify who entered information, not independently verified clinician credentials or clinical accuracy. See [clinician access](CLINICIAN_ACCESS.md) for the current workflow.

## Android 0.1.0-preview storage boundary

The Android patient journal reuses the diary definitions and statistical rules above. First-offline records have a local profile identity and queued operations. Account association and upload require explicit user confirmation followed by manual HTTPS synchronization; conflicts remain pending rather than being silently overwritten.

Local snapshots and imported audio are encrypted with an Android Keystore-backed key. Password-encrypted portable backups include the local diary, drafts, history, pending changes, imported audio and cached advice, but exclude login/session credentials. Restoration validates the backup and preserves a local recovery point. Audio is not automatically uploaded with diary synchronization. Cached clinician advice is read-only offline; new feedback requires the connected service. Physical-device and cross-device acceptance remain post-prerelease tasks, not evidence supplied by these field definitions.
