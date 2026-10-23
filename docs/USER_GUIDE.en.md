# English user guide — 0.8.2

The [0.8.2 research pre-release](https://github.com/Alias1027/Multi-language-Headache-Diary--/releases/tag/v0.8.2) includes web/server 0.8.2 and Android 0.1.0-preview; [hosted CI](https://github.com/Alias1027/Multi-language-Headache-Diary--/actions/runs/40021043776) passed for its tagged commit. **Physical-device acceptance follows the experimental pre-release; the candidate is not yet physically device-validated.** See [current release notes](RELEASE_NOTES_0.8.2.md) and [post-pre-release tasks](RELEASE_PARTICIPATION.md).

## 0.8.2 Sign-in portals and clinician access

The sign-in page clearly separates **Patient sign-in** and **Clinician sign-in**, using separate credentials. Choosing a portal neither changes an account's role nor grants access. Synthetic demonstration is a secondary option below the patient sign-in form.

Patients manage connection codes, clinician identity, access scope, expiry and revocation in **Settings → Clinician access**. **Advice & follow-up** shows a compact connection status and a **Manage access** shortcut. When no clinician is linked, **Connect my clinician** opens that settings section. Advice, plan history and patient feedback stay on the advice page.

Both portals and patient navigation are available in all eight languages, with right-to-left layout for Arabic and Urdu. Clinician registration still needs operator approval; sign-in and authorization require a service connection. Existing accounts, records and permissions are retained.


## First offline Android use

Install the standalone APK and create a local profile without connectivity. Use an existing phone recorder or import audio, and export/restore password-encrypted backups. Online account linking and clinician grants require separate confirmation. See the [Android guide](ANDROID_OFFLINE.md).

**0.8.2 research pre-release is published.** Download the current source, Windows and Android assets from the [0.8.2 Release](https://github.com/Alias1027/Multi-language-Headache-Diary--/releases/tag/v0.8.2); historical 0.7.0 files remain separate. Follow the new [bilingual clinician account and authorization guide](CLINICIAN_ACCESS.md).

[中文指南](USER_GUIDE.zh.md) · [README](../README.md) · [offline/mobile details](OFFLINE_MOBILE.md)

1. From the [0.8.2 Release](https://github.com/Alias1027/Multi-language-Headache-Diary--/releases/tag/v0.8.2), select the Windows x64 portable ZIP and SHA256SUMS.txt. Verify the candidate's SHA-256 and extract all files. Double-click Start.cmd; source users install Node.js24 and run npm start. Stop.cmd stops the local service. Use the same extraction folder next time to retain its data.
2. Choose a synthetic case for a short demonstration, or register an experimental account for repeatable sign-in. Demo accounts have no recoverable password. Do not put real personal health information into this research prototype.
3. In My diary, choose the day, state whether headache/acute medication occurred, and complete the relevant pain and medication details. Unknown, no symptoms and missing answers are distinct. Untouched starter forms are excluded. Save after review.
4. Offline after initialization, continue other dates or amend the same day. The pending list distinguishes browser-only records from server-saved data. Keep the same browser and URL, export a backup, and sync when connected. If the session expires, sign in to the same account. Never clear a conflict queue before exporting and reviewing it.
5. Voice entry accepts recording/upload or reviewed Chinese/English text candidates. Models are optional and disabled by default. Review each field before applying it; suggested medication is not automatically an actual dose.
6. Once synchronized, choose a period and language in Visit summary. The summary shows missingness, diary statistics and a snapshot of published plan/feedback history. Print or download JSON. Later changes do not rewrite old reports.
7. Patient-entered advice remains identified as patient transcription. In Advice & follow-up, inspect confirmed clinician advice, each feedback entry and plan versions; these are not electronic prescriptions. Actual medication entries remain separate.
8. Settings controls language, simulated reminders, sharing consent and exports. All external reminder channels and institution delivery remain simulations; receipts do not mean a real clinician has read a record.

Phone browser use does not require a native app or PWA, but first needs an operator-provided HTTPS service. Default local startup does not expose the computer to phones. [Deployment instructions](MOBILE_DEPLOYMENT.md) and [real-device checklist](OFFLINE_MOBILE.md) describe what remains to be done. An installed PWA still needs initial setup and later service access for synchronization/reporting.

Back up the entire server data directory with the service stopped, including the encryption keys. Export pending browser entries separately. Never publish data, keys, recordings or backups. See [portable upgrades](WINDOWS_PORTABLE.md), [validation](VALIDATION.md) and [license/authorization](LICENSING.md).

Clinicians use the independent `/clinician.html` entry with separate credentials. After operator approval, patients explicitly grant expiring, revocable access. The workspace guides diary/feedback review, dated summary review and advice/follow-up confirmation. Patient changes invalidate earlier review evidence; historical plan and feedback links remain intact.
