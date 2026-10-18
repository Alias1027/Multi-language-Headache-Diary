# Language support and review — 0.7.0

The application offers eight complete interface catalogs. This is a research preview, not evidence that the translations are clinically validated or cover all members of any ethnic group.

| Language | Code | Native name | Interface direction |
|---|---|---|---|
| Chinese | zh | 简体中文 | LTR |
| English | en | English | LTR |
| Spanish | es | Español | LTR |
| French | fr | Français | LTR |
| Russian | ru | Русский | LTR |
| Arabic | ar | العربية | RTL |
| Hindi | hi | हिन्दी | LTR |
| Urdu | ur | اردو | RTL |

## What is consistent

Each language has 650 keys in six namespaces: base (293), diary (54), workspace (150), assessment (31), voice (81), reminders (41). Native-language picker names, product names, medical abbreviations and units may intentionally use their conventional spelling. All 175 previously Chinese/English-only guidance keys now have Spanish/French/Russian/Arabic translations. Missing a key in a supported catalog fails the parity test; content is no longer silently replaced with English for those languages.

Patient fields, assessment and follow-up editors, shared settings and voice control explanations use these catalogs. New reports follow the selected interface unless an independent report language is requested. Existing report language and original clinical text are preserved. Stored clinical concept codes, quantities, dates and statistical rules are not translated. Glossary version is 0.2.0; statistical rules remain 0.1.0. Older report snapshots retain their metadata.

Hindi uses Devanagari LTR layout. Urdu and Arabic use RTL layout, including navigation and the floating voice panel. Dates, numeric inputs, email addresses, percentages and numeric ranges retain LTR order where appropriate. Numeric ranges inside RTL catalog prose use Unicode directional isolates (U+2066 and U+2069). Free-text areas determine direction from their own content and do not translate it. Reports determine direction from their own language, independently of the surrounding page.

Script-aware system font stacks and additional line height support connected Arabic letters and Devanagari marks. No remote fonts are requested. Actual fonts depend on the operating system; cross-platform font and screen-reader validation remains pending. Native browser date/file controls may use the browser/OS language rather than the application's selected language.

## Speech is a separate capability

Voice transcription and structured extraction still accept only Chinese and English. The interface explicitly explains this in all eight languages. Model interfaces remain disabled unless configured; no Hindi, Urdu, Hinglish or Roman Urdu speech model is bundled or validated. Original audio/transcript and reviewed candidate provenance retain the existing protection and manual review workflow.

English + Hindi + Urdu are the initial formal interface choices for the intended expansion. Hinglish (Hindi-English code mixing) and Roman Urdu (Urdu in Latin script, sometimes mixed with English) are separate future input profiles, not interchangeable language standards or promises of population coverage. Prioritize them through target-patient reading/input preference interviews and realistic task testing. Candidate accuracy must be measured for negation, side, dose/unit, timing and uncertain expressions before release.

## Review materials and limits

`INTERFACE_TRANSLATION_REVIEW.csv` lists all 650 keys with all eight translations and blank reviewer/status columns. `TRANSLATION_REVIEW.csv` retains the focused clinical concept checklist. Neither file signifies approval. Next review stages are independent native clinical review, patient comprehension tests, reconciliation of terminology, and task-based LTR/RTL usability testing.

Automated checks verify matching keys, availability, concept distinctions, report-language settings, unchanged numbers and clinical data, offline catalog caching and retained speech-language limits. Browser checks are documented in VALIDATION.md. These do not establish clinical equivalence, usability for all literacy levels, speech accuracy or clinical benefit.

## References for script and input design

- [W3C Devanagari Script Resources](https://www.w3.org/TR/deva-lreq/)
- [W3C Arabic Script Resources, including Urdu](https://w3c.github.io/alreq/arab/)
- [HingCorpus: Roman Hindi-English code-mixed corpus](https://aclanthology.org/2022.wildre-1.2/)
- [Roman Urdu research](https://aclanthology.org/2025.lowresnlp-1.9/)

## 0.6.1 care history and summary copy

Two small eight-language catalogs (`care-history-i18n.mjs` and `care-report-ui.mjs`) add feedback-history, provenance, snapshot-scope and update notices. Rendering and browser checks cover all eight languages and RTL; original patient/clinician text is preserved, not machine-translated. Native linguistic and clinical review remains pending.


## 0.7.0 offline messages

Nineteen additional base strings cover pending records, re-authentication, conflicts, storage status and connection limits in all eight languages. Independent native review is still pending; parity tests check keys, not clinical or linguistic equivalence.
