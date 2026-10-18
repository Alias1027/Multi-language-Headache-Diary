# English user guide — 0.7.0

[中文指南](USER_GUIDE.zh.md) · [README](../README.md) · [offline/mobile details](OFFLINE_MOBILE.md)

1. Download the Windows x64 portable ZIP from the official Release, verify its checksum and extract all files. Double-click Start.cmd; source users install Node.js24 and run npm start. Stop.cmd stops the local service. Use the same extraction folder next time to retain its data.
2. Choose a synthetic case for a short demonstration, or register an experimental account for repeatable sign-in. Demo accounts have no recoverable password. Do not put real personal health information into this research prototype.
3. In My diary, choose the day, state whether headache/acute medication occurred, and complete the relevant pain and medication details. Unknown, no symptoms and missing answers are distinct. Untouched starter forms are excluded. Save after review.
4. Offline after initialization, continue other dates or amend the same day. The pending list distinguishes browser-only records from server-saved data. Keep the same browser and URL, export a backup, and sync when connected. If the session expires, sign in to the same account. Never clear a conflict queue before exporting and reviewing it.
5. Voice entry accepts recording/upload or reviewed Chinese/English text candidates. Models are optional and disabled by default. Review each field before applying it; suggested medication is not automatically an actual dose.
6. Once synchronized, choose a period and language in Reports & follow-up. The summary shows missingness, diary statistics and a snapshot of published plan/feedback history. Print or download JSON. Later changes do not rewrite old reports.
7. Patient-entered advice remains identified as patient transcription. Simulated clinician plans and feedback can be inspected individually; they are not verified prescriptions. Actual medication entries remain separate.
8. Settings controls language, simulated reminders, sharing consent and exports. All external reminder channels and institution delivery remain simulations; receipts do not mean a real clinician has read a record.

Phone browser use does not require a native app or PWA, but first needs an operator-provided HTTPS service. Default local startup does not expose the computer to phones. [Deployment instructions](MOBILE_DEPLOYMENT.md) and [real-device checklist](OFFLINE_MOBILE.md) describe what remains to be done. An installed PWA still needs initial setup and later service access for synchronization/reporting.

Back up the entire server data directory with the service stopped, including the encryption keys. Export pending browser entries separately. Never publish data, keys, recordings or backups. See [portable upgrades](WINDOWS_PORTABLE.md), [validation](VALIDATION.md) and [license/authorization](LICENSING.md).
