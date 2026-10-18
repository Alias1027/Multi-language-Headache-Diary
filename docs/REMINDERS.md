# Patient reminders / 患者提醒

Version: **0.7.0 experimental pre-release**

## Feature highlight / 亮点功能

**Patient-controlled reminders / 患者自主提醒：** personalized schedules, languages and messages, with quiet hours, pause dates and completed-day suppression. Contacts and reminder history remain separate from clinical sharing. The feature is designed to support continued recording while respecting patient choice; adherence benefit is not yet established.

患者可按生活节奏设置提醒，并通过免打扰、暂停和填写完成后跳过减少重复提示。可以测试计划和查看历史，便于后续开展真实渠道接入与患者使用研究。**当前均为本机模拟，不外发，不宣称已改善依从性。**

## What runs now

The Settings reminder panel supports eight UI languages, a message language independent of the UI, one chosen time on selected weekdays, an IANA time zone, custom text up to 240 UTF-16 code units, quiet hours, an inclusive pause-through date, and completed-day suppression. A blank message uses the selected language's neutral default. Disabling the schedule takes effect at the next scheduler tick. Tests explicitly bypass schedule, quiet hours, completion and pause settings.

**All channels are local simulations.** Email, SMS, PWA/Web Push, WeChat and Alipay are selectable experimental channels, not connected providers. Phone/email fields do not verify ownership, bind platform accounts or grant subscription permission. No message is sent out of the local service. The in-page notice can display a newly simulated scheduled event while the logged-in page is open; it is not an OS notification.

In an operator-hosted HTTPS pilot, these simulations run inside the connected diary service, not on the patient's phone. Settings changes and simulated reminder retrieval still need that service; the offline diary queue does not provide background mobile reminders or external delivery. / 在维护者部署的HTTPS试点中，模拟提醒运行在所连接的日记服务内，不是在患者手机本机。提醒设置和读取仍需连接服务；离线日记不自动提供手机后台提醒或外部投递。

## Timing and data rules

- Opt-in is separate from clinical sharing. Existing accounts are not automatically enrolled. Saving new reminder settings retires the old foreground-only timer.
- The running server checks once per minute. It accepts a due time up to 15 minutes late on the same local date; it never replays a backlog. A DST-skipped time can be missed. A repeated DST hour cannot duplicate that day's event.
- One scheduled batch per selected local date, with one event per chosen channel. Day keys survive restart. Saving a new schedule does not clear an already used day key. Test batches have separate IDs and a 30-second rate limit.
- Quiet hours skip the batch without a delayed catch-up. Pause-through dates are inclusive in the reminder time zone. Pause/disable does not erase prior history.
- Completed-day suppression uses **the diary time zone**, even when the reminder uses another zone. It requires known yes/no headache and acute-medication answers, a known preventive-medication answer (yes/no/not applicable), and known daily impact (none/limited/unable). Missing or unknown values are incomplete. This is a reminder rule, not a judgment of clinical completeness or treatment benefit.
- Last 100 channel events are retained; the UI shows the newest 20. Status is `simulated`, `skipped_quiet`, `skipped_completed` or `failed`, never “delivered”. Failure does not trigger automatic message bursts; an explicit test can be retried after the rate limit.
- Settings and history use the existing encrypted account profile, separate from the clinical vault. Read access does not change accounts. There are no new database tables. Contact details are not returned to clinicians, included in clinical exports/reports, placed in URLs, or cached in the browser's offline vault. The authenticated patient's `/api/reminders` response contains their own configuration and history. Local account data and backups therefore still require access protection.
- An offline or unauthenticated client cannot configure reminders. Conflicting saves return HTTP 409. Contacts can be removed by clearing their fields and saving (disable their channel or the schedule when required); historical database backups retain prior encrypted versions.

## API and extension seam

| Endpoint | Meaning |
| --- | --- |
| `GET /api/reminders` | Patient's configuration, revision, simulation connection statuses and history |
| `POST /api/reminders` | Save `{revision, config}` with session, same-origin and CSRF checks |
| `POST /api/reminders/test` | Test the saved plan locally; no external transport |

Implementation: `server/reminders.mjs` exports `REMINDER_CHANNELS`, `validateReminder`, `saveReminders`, `viewReminders` and `runReminders`. Its synchronous **simulation-only** adapter is `simulate({idempotencyKey, channel, language, message}) -> {status: 'simulated'}`. Target contacts, credentials and platform IDs are deliberately not passed to this simulator. Unit tests inject a failing simulator without network calls.

Do not replace `simulate()` with live network calls. A production adapter is a separate integration task: verified email/phone or platform binding, per-channel opt-in/revocation, permitted templates, server-side secrets, a persistent transactional outbox, per-recipient limits, expiry, retry/backoff, provider idempotency and authenticated receipts. Recheck current platform rules and approved account capabilities. WeChat/Alipay require their own subscription authorization; freely edited local text does not imply permission to send arbitrary platform messages. Web Push needs a suitable deployed HTTPS origin, browser/device support, permission and a valid push subscription. A closed local server cannot send scheduled reminders.

No real provider credentials, message-sending endpoint, recipient verification or PWA push subscription registration is included in this release.

## 中文使用说明

打开“设置 → 提醒”，选择每周提醒日、时间、时区、语言及模拟渠道，按需填写邮箱或手机号码，设置免打扰和暂停日期，勾选自主授权后保存。留空消息采用所选语言的中性提醒；避免将病情和身份信息写入锁屏可能显示的内容。

“测试已保存计划”只测试已经保存的设置，绕过时段与暂停，但不会向外发送。历史中的“已模拟，未外发”不能作为邮件、短信或小程序消息送达证据。关闭提醒或暂停不会影响正常日记记录。

本机服务需保持运行，提醒不会提高真实用户依从性的结论尚未验证。后续研究可分别观察授权率、到达/打开率、记录覆盖率、留存、关闭提醒比例和患者负担，不能用模拟发送成功推断临床效果。

In 0.5.3, other Settings submissions and refresh actions warn before discarding an unsaved reminder draft. Cancelling preserves the text. Idle clinical-sharing ticks no longer rewrite unchanged vaults; due reminders still persist their simulated outcomes.
