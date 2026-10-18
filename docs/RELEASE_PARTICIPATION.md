# Release and human testing checklist / 发布与真人测试清单 — 0.7.0


Updated / 更新：2026-10-18. 本清单面向 **0.7.0** 多日离线、弱网及手机使用改进；以[本版验收记录](VALIDATION.md)为自动检查、提交及发布状态的依据。下文0.6.1数字仅为历史证据。This checklist targets **0.7.0**; [version-specific validation](VALIDATION.md) records its engineering and publication evidence. Historical 0.6.1 results do not certify this update. Unchecked human tasks remain pending.

## 中文：历史0.6.1发布与本轮后续核验

- [x] [实际GitHub仓库](https://github.com/Alias1027/Multi-language-Headache-Diary--)已公开。仓库以项目源码为根目录，运行环境与一键启动器通过独立便携附件提供。
- [x] 发布标签提交 `c1644cd` 的[远程CI](https://github.com/Alias1027/Multi-language-Headache-Diary--/actions/runs/39118500923)已通过：Ubuntu与Windows每个平台137项自动测试，以及发布检查和源码打包／解压核验。此前101项浏览器检查属于本机合成验证。
- [x] [v0.6.1实验预发布版](https://github.com/Alias1027/Multi-language-Headache-Diary--/releases/tag/v0.6.1)已发布，附源码ZIP、Windows x64便携ZIP、`SHA256SUMS.txt`及双语发布说明。
- [x] 三个发布附件均已重新下载并核对SHA-256；这项下载核验不等于独立用户的首次使用验收。
- [x] 公开测试邀请已随Release提供；尚未核验独立参与者招募或完成测试。
- [ ] 核验并按需启用仓库私密漏洞报告，确认安全联系方式及Issue模板。不要在公开Issue收集患者信息、数据库、音频、登录信息或密钥；仓库相关设置不能仅凭文档认定完成。
- [ ] 由独立用户从最终附件在新目录完成体验：核对哈希、全部解压、启动、保存合成记录、生成摘要、停止、重启并检查记录仍在。维护者本机核验不能替代另一位用户的验证。

以上已勾选的发布检查均针对历史0.6.1；本轮0.7.0需要独立提交、CI、标签与附件核验，结果见[验收记录](VALIDATION.md)。`v0.6.1`标签及两个ZIP与校验文件保持冻结。若导入旧Git历史，仍需另查历史中的私密内容与旧许可，当前文件检查不覆盖全部旧提交。

**包的区别：** 源码包需要Node.js 24；Windows x64便携包自带运行环境及一键入口，属于单独Release附件，不把 `runtime/` 提交进源码仓库。包内不含已有账号、数据或密钥。详见[下载与首次使用](WINDOWS_PORTABLE.md)。

## 中文：邀请少量独立体验者

可邀请 **3–5位自愿体验者**，包括普通使用者、能评审随访摘要的医生，以及适合的母语审阅者；这是可选构成，不是要求各语种已覆盖。先做小规模可用性反馈，母语临床审校另行记录。独立个人非商业实验按现有许可进行；**机构组织的评估、非营利机构使用及任何商业用途均须先取得书面授权**。邀请本身不构成许可豁免。

每位体验者可选择约15–20分钟完成部分或全部任务，随时停止，无需披露自身健康信息：

| 合成任务 | 观察与反馈 |
| --- | --- |
| 从ZIP和说明启动，再停止、重新打开 | 能否独立完成；是否找到开始入口；有无不理解的系统提示；重启后原记录是否仍在 |
| 用虚构案例记录一天“无头痛”和一天“有头痛” | 是否区分无、未知和未填；是否理解实际用药与建议方案的区别；记录是否容易修改 |
| 填写两次虚构方案反馈，查看历史，再生成摘要 | 能否找到每条反馈和版本；摘要是否能看出记录缺失、建议来源和患者主观变化 |
| 使用键盘、窄窗口或浏览器缩放，切换熟悉的语言 | 字体、按钮、顺序、RTL方向、截断、键盘焦点以及术语理解问题 |
| 在语音浮窗输入一段合成中英文文字 | 能否逐项核对候选并发现错误；能否明白文本演示不等于已接通语音识别模型 |
| 首次在线登录并缓存后，断开服务，填写三个不同日期并修订其中一天，再恢复连接 | 能否看清待同步状态；是否可以继续记录；同步后天数和版本是否一致，是否重复或丢失 |
| 在手机或PWA关闭重开，再经历会话过期与原账号重新登录 | 原记录是否仍在；是否理解本机保存与服务端入库的区别；不要清除站点数据或使用无法恢复密码的临时演示账号 |

请记录任务是否完成、约用时、卡住的位置、误填/误解和希望改变之处；这些是可用性观察，不是疗效数据。不要要求用户为完成任务强行录入药物或确认不理解的字段。

### 可复制反馈模板

```text
版本：0.7.0
包类型：Windows x64便携 / 源码
系统、浏览器及语言（无需设备序列号）：
使用方式：电脑浏览器 / 手机浏览器 / 已安装PWA
联网、断网或弱网；仅记录大致情形，无需IP地址：
任务与使用的合成示例：
复现步骤：
期望结果 / 实际结果：
是否完成、约用时、卡住位置：
相关界面截图（仅合成数据，已检查无个人信息）：
建议：
```

反馈可以通过[官方仓库Issues](https://github.com/Alias1027/Multi-language-Headache-Diary--/issues)或邮件发送给 **Junhui Liu M.D. — junhuiliu1025@gmail.com**。安全漏洞通过私密渠道反馈；不要公开利用细节、凭据或任何人的资料。可先发送不含附件的简短问题描述，未经请求无需发送日志或数据包。

### 尚待真人或外部环境完成的验证

- [ ] 新设备的Windows首次运行；目标浏览器、显示缩放和键盘/辅助技术体验。
- [ ] 八种语言分别进行母语可读性审阅；临床术语及统计规则由合适专业人员独立复核。没有对应审阅人时仍标“待审校”。
- [ ] 由维护者完成实际HTTPS域名、证书与代理部署后，使用入门Android及iPhone/Safari验收；当前只有可选配置基础，没有已托管的手机临床服务。
- [ ] 分别验证手机浏览器/PWA断网三天、多日录入、同日修订、关闭重开、后台回收、低存储、恢复连接和会话过期；核对无静默丢失或重复。部署换域名前同步及备份。
- [ ] 分别验证PWA安装/升级和小程序平台接入；电脑窄屏模拟不替代真机，浏览器数据清理后的丢失提示也需验证。
- [ ] 如拟面向真实患者、机构或研究使用，另行明确授权、隐私、安全、伦理/研究方案及支持职责。当前测试邀请仅涉及合成病例可用性体验。

公开双语邀请见[测试邀请](TEST_INVITATION.md)，已随Release提供。邀请公开不表示已招募独立参与者或完成真人测试。

## English: historical 0.6.1 publication and current follow-up

- [x] The [actual GitHub repository](https://github.com/Alias1027/Multi-language-Headache-Diary--) is public. The repository root contains the project source; the runtime and one-click launchers are provided in the separate portable asset.
- [x] [Hosted CI](https://github.com/Alias1027/Multi-language-Headache-Diary--/actions/runs/39118500923) passed for release-tag commit `c1644cd`: 137 automated tests per platform on Ubuntu and Windows, plus release checks and source packaging/extraction verification. The prior 101 browser checks were local synthetic checks.
- [x] The [v0.6.1 research pre-release](https://github.com/Alias1027/Multi-language-Headache-Diary--/releases/tag/v0.6.1) is published with the source ZIP, Windows x64 portable ZIP, `SHA256SUMS.txt` and bilingual release notes.
- [x] All three release assets were downloaded again and their SHA-256 checksums verified. Download verification does not replace independent first-use acceptance.
- [x] The public testing invitation is included in the Release; independent participant recruitment or completed testing has not been verified.
- [ ] Verify and, where appropriate, enable private vulnerability reporting, and confirm the security contact and issue templates. Do not collect patient information, databases, recordings, credentials or keys in public issues. Documentation alone does not establish that repository settings are configured.
- [ ] Have an independent user try the final downloadable assets in a fresh folder: verify checksums, extract, start, save a synthetic record, generate a summary, stop, restart and check persistence. The maintainer's host check does not replace this independent attempt.

The checked publication items above describe historical 0.6.1 only. Version 0.7.0 requires its own commit, CI, tag and asset verification; see [validation](VALIDATION.md). The `v0.6.1` tag, both ZIP assets and checksum file remain frozen. Imported Git history still needs separate checks for private material and previous license grants; current-tree checks do not cover all earlier commits.

The source ZIP needs Node.js 24. The separate portable Release asset includes the runtime and one-click entry points; do not commit `runtime/` to the source repository. Neither clean asset contains existing accounts, records or keys. See [download and first use](WINDOWS_PORTABLE.md).

## English: small independent usability trial

Consider inviting **3–5 volunteers**, such as everyday users, a clinician reviewing summaries and appropriate native-language reviewers. This is a suggested mix, not a claim of coverage of every language. Participation is optional; approximately 15–20 minutes can cover selected tasks, with no need to disclose personal health information. Independent personal noncommercial experimentation follows the license. **Institutional evaluation, nonprofit institutional use and all commercial use require prior written authorization.** This invitation does not waive the license.

Suggested synthetic tasks:

1. Start from the ZIP and guide; stop and reopen, checking that saved synthetic records remain.
2. Record one fictional headache-free day and one headache day; explain how “no,” “unknown” and missing differ, and separate actual medication from advice.
3. Add two fictional plan-feedback entries, review each historical entry and generate a summary. Check whether dates, versions, missingness and patient-reported observations are understandable.
4. Try a familiar language, keyboard navigation, a narrow window and browser zoom. Note clipping, small labels, focus order, RTL problems or unclear terms.
5. Enter synthetic Chinese/English text in the voice panel and review proposed fields. Check that the difference between text assistance and an enabled speech model is clear.
6. After connected sign-in and caching, disconnect the service, record three different dates and amend one day, then reconnect. Check the pending status, continued recording, exact dates/revisions and absence of duplicate or missing entries.
7. Close and reopen a mobile browser/PWA, then try session expiry and sign-in to the original account. Check retained records and the distinction between browser-saved and server-saved data. Do not clear site data or use an unrecoverable temporary demo account for this exercise.

Record completion, approximate time, confusion, mistakes and suggested improvements. These are usability observations, not treatment outcomes. Participants may stop or skip any task; do not ask them to provide medications or endorse fields they do not understand.

### Copyable feedback template

```text
Version: 0.7.0
Package: Windows x64 portable / source
OS, browser and interface language (no device identifiers):
Access: desktop browser / mobile browser / installed PWA
Connected, offline or weak network; general description only, no IP address:
Task and synthetic example:
Steps to reproduce:
Expected / actual result:
Completed?, approximate time and point of difficulty:
Screenshot (synthetic data only, checked for personal information):
Suggestion:
```

Contact **Junhui Liu M.D. — junhuiliu1025@gmail.com**, or use the [official repository's Issues](https://github.com/Alias1027/Multi-language-Headache-Diary--/issues). Report security concerns privately. A short description without attachments is enough to begin; do not send records, recordings, logs or keys unless a safe synthetic reproduction has been agreed.

### External checks still pending

- [ ] First use on another Windows device; supported browsers, zoom, keyboard and assistive-technology review.
- [ ] Native readability review for each of the eight languages, plus independent review of clinical terms and statistical rules. Keep unreviewed languages clearly marked.
- [ ] Actual HTTPS domain, certificate and proxy deployment by an operator, then entry-level Android and iPhone/Safari checks. The optional configuration does not create a hosted mobile clinical service.
- [ ] Mobile browser/PWA checks for three-day offline use, multi-day entries, same-day amendments, restart, background suspension, low storage, reconnect and session expiry; check for silent loss/duplicates. Synchronize and back up before an origin change.
- [ ] Separate PWA install/upgrade and mini-program platform checks, including messages after site-data removal. Desktop resizing is not real-device validation.
- [ ] Separate authorization, privacy, security, ethics/research planning and support responsibilities before any real-patient, institutional or research use.

The [public testing invitation](TEST_INVITATION.md) is included in the Release. A public invitation does not establish that independent volunteers have been recruited or human testing completed.
