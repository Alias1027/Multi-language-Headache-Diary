# Release and human testing checklist / 发布与真人测试清单 — 0.6.1

Updated / 更新：2026-10-18. This checklist separates prepared local materials from actions that need the project owner or independent participants. Unchecked items are pending, not completed validation.

## 中文：发布者需要完成

- [ ] 确定仓库账户、名称和公开范围，创建真实GitHub仓库；仅以纯源码包内的 `project` 为仓库根目录。若导入旧提交历史，检查历史中的私密内容与旧许可。
- [ ] 在仓库填写实际简介、授权邮箱和真实链接；README中的状态在上传后再更新。不要编造尚不存在的网址、下载量或用户评价。
- [ ] 提交源码后运行现有Windows/Linux GitHub Actions，检查完整日志并处理失败。实际结果通过前，不宣称远程CI成功。现有自动工作流不等于真人浏览器或临床测试。
- [ ] 在仓库可用时启用私密漏洞报告；确认安全联系方式。准备Issue模板，引导只提交合成复现案例。不要在公开Issue收集患者信息、数据库、音频、登录信息或密钥。
- [ ] 从最终附件在新目录完成一次独立下载体验：核对哈希、全部解压、启动、保存合成记录、生成摘要、停止、重启并检查记录仍在。当前维护者本机核验不能替代另一位用户的验证。
- [ ] 给已通过检查的提交打 `v0.6.1` 标签，建立 **Pre-release**，上传源码ZIP、已净化Windows x64便携ZIP及各自SHA-256校验文件，并附双语发布说明。只上传指定干净附件，不上传活动交付目录。
- [ ] 亲自检查公开附件能下载、链接正确、八语和新功能图片可见、许可醒目，再发布。记录最终仓库/Release网址、CI运行链接和日期。

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

请记录任务是否完成、约用时、卡住的位置、误填/误解和希望改变之处；这些是可用性观察，不是疗效数据。不要要求用户为完成任务强行录入药物或确认不理解的字段。

### 可复制反馈模板

```text
版本：0.6.1
包类型：Windows x64便携 / 源码
系统、浏览器及语言（无需设备序列号）：
任务与使用的合成示例：
复现步骤：
期望结果 / 实际结果：
是否完成、约用时、卡住位置：
相关界面截图（仅合成数据，已检查无个人信息）：
建议：
```

反馈可以通过发布后的官方仓库Issue或邮件发送给 **Junhui Liu M.D. — junhuiliu1025@gmail.com**。安全漏洞通过私密渠道反馈；不要公开利用细节、凭据或任何人的资料。可先发送不含附件的简短问题描述，未经请求无需发送日志或数据包。

### 尚待真人或外部环境完成的验证

- [ ] 新设备的Windows首次运行；目标浏览器、显示缩放和键盘/辅助技术体验。
- [ ] 八种语言分别进行母语可读性审阅；临床术语及统计规则由合适专业人员独立复核。没有对应审阅人时仍标“待审校”。
- [ ] 部署适配后进行手机真机浏览器测试；再分别验证PWA安装/升级和小程序平台接入，不以电脑缩放替代真机验证。
- [ ] 如拟面向真实患者、机构或研究使用，另行明确授权、隐私、安全、伦理/研究方案及支持职责。当前测试邀请仅涉及合成病例可用性体验。

可发布的双语邀请见[测试邀请](TEST_INVITATION.md)。本清单与邀请已准备，不表示已经发出邀请、招募参与者或完成真人测试。

## English: actions for the project owner

- [ ] Choose the actual GitHub account, repository name and visibility. Import only the source ZIP's `project` as the repository root; audit any imported Git history for private material and prior license grants.
- [ ] Add the real description, authorization contact and repository links. Update download/publication status only after upload; do not invent URLs, usage figures or testimonials.
- [ ] Run the provided Windows/Linux GitHub Actions, inspect full logs and resolve failures. Local success is not evidence that hosted CI has passed. Automated checks do not replace human browser or clinical review.
- [ ] Enable private vulnerability reporting when available and confirm the security contact. Configure issue templates requesting synthetic reproductions only; do not collect patient information, databases, recordings, credentials or keys in public issues.
- [ ] Have an independent user try the final downloadable assets in a fresh folder: verify checksums, extract, start, save a synthetic record, generate a summary, stop, restart and check persistence. The maintainer's host check does not replace this independent attempt.
- [ ] Tag the checked commit `v0.6.1` and create a **Pre-release**. Attach the source ZIP, sanitized Windows x64 portable ZIP, their SHA-256 lists and bilingual release notes. Upload designated clean artifacts only, never the active delivery directory.
- [ ] Check downloads, links, all eight language examples, new-feature screenshots and the license notice before publication. Record actual repository/Release URLs, CI links and date.

The source ZIP needs Node.js 24. The separate portable Release asset includes the runtime and one-click entry points; do not commit `runtime/` to the source repository. Neither clean asset contains existing accounts, records or keys. See [download and first use](WINDOWS_PORTABLE.md).

## English: small independent usability trial

Consider inviting **3–5 volunteers**, such as everyday users, a clinician reviewing summaries and appropriate native-language reviewers. This is a suggested mix, not a claim of coverage of every language. Participation is optional; approximately 15–20 minutes can cover selected tasks, with no need to disclose personal health information. Independent personal noncommercial experimentation follows the license. **Institutional evaluation, nonprofit institutional use and all commercial use require prior written authorization.** This invitation does not waive the license.

Suggested synthetic tasks:

1. Start from the ZIP and guide; stop and reopen, checking that saved synthetic records remain.
2. Record one fictional headache-free day and one headache day; explain how “no,” “unknown” and missing differ, and separate actual medication from advice.
3. Add two fictional plan-feedback entries, review each historical entry and generate a summary. Check whether dates, versions, missingness and patient-reported observations are understandable.
4. Try a familiar language, keyboard navigation, a narrow window and browser zoom. Note clipping, small labels, focus order, RTL problems or unclear terms.
5. Enter synthetic Chinese/English text in the voice panel and review proposed fields. Check that the difference between text assistance and an enabled speech model is clear.

Record completion, approximate time, confusion, mistakes and suggested improvements. These are usability observations, not treatment outcomes. Participants may stop or skip any task; do not ask them to provide medications or endorse fields they do not understand.

### Copyable feedback template

```text
Version: 0.6.1
Package: Windows x64 portable / source
OS, browser and interface language (no device identifiers):
Task and synthetic example:
Steps to reproduce:
Expected / actual result:
Completed?, approximate time and point of difficulty:
Screenshot (synthetic data only, checked for personal information):
Suggestion:
```

Contact **Junhui Liu M.D. — junhuiliu1025@gmail.com**, or use the official repository's Issues after publication. Report security concerns privately. A short description without attachments is enough to begin; do not send records, recordings, logs or keys unless a safe synthetic reproduction has been agreed.

### External checks still pending

- [ ] First use on another Windows device; supported browsers, zoom, keyboard and assistive-technology review.
- [ ] Native readability review for each of the eight languages, plus independent review of clinical terms and statistical rules. Keep unreviewed languages clearly marked.
- [ ] Real-device mobile-browser checks after deployment adaptation; separate PWA install/upgrade and mini-program platform checks. Desktop resizing is not real-device validation.
- [ ] Separate authorization, privacy, security, ethics/research planning and support responsibilities before any real-patient, institutional or research use.

The [public testing invitation](TEST_INVITATION.md) is ready to copy. Preparing this checklist does not mean invitations were sent, volunteers recruited or human testing completed.
