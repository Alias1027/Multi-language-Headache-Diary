# Release and human testing checklist / 发布与真人测试清单 — 0.8.2

<!-- release-target: 0.8.2 -->

更新 / Updated: 2026-10-23 · Web/server **0.8.2** · Android **0.1.0-preview**.

## 中文：当前状态与发布顺序

当前是本机准备的实验预发布候选，尚未发布本版 GitHub Release 或应用商店。旧版0.6.1/0.7.0的发布与CI属于历史证据，不能替代本版检查。当前范围见[发布说明](RELEASE_NOTES_0.8.2.md)，发布技术门槛见[发布检查单](RELEASE_CHECKLIST.md)。

**按维护者安排，真机验收在实验预发布后进行，不作为本次实验预发布的前置条件。** 对外须保留“尚未真机验证”，先用合成病例收集反馈；不把模拟器通过写成正式临床使用、安全认证或全机型兼容。真机、母语和专业复核完成前，相关事项继续标为待验证。

### 维护者发布核对

- [ ] 在最终代码上记录核心、浏览器、Android构建/模拟器结果，核对已有数据保留情况。
- [ ] 核对独立的源码ZIP、Windows x64便携ZIP、Android APK及SHA-256；不包含原有账号、数据库、密钥、录音、备份、QA或私有签名材料。
- [ ] 核对最终提交的远程自动测试与Android构建；把实际运行链接放入发布记录，不能复用旧版结果。
- [ ] 标记为实验预发布，写明八语言、可用入口与待真机验证范围，再上传匹配的附件。
- [ ] 发布后重新下载附件核对哈希；更新仓库/下载/CI链接。
- [ ] 核验仓库私密漏洞报告、联系方式和Issue模板。公开Issue只接受不含个人信息的合成复现。

未勾选表示尚待确认，不代表文件缺失。技术结果以[验收记录](VALIDATION.md)及最终交付记录为准。

### 预发布后：邀请独立体验者

可邀请3–5位自愿体验者（普通使用者、医生及合适的母语审阅者），每人约15–20分钟选择任务，随时停止，无需披露自身健康资料。此人数只是起步建议，不代表覆盖八语言、全部机型或形成临床试验。个人非商业实验遵守现有许可；**机构组织的评估、非营利机构使用及任何商业用途均须先取得书面授权**，邀请不构成许可豁免。

| 合成任务 | 重点观察 |
| --- | --- |
| 新Windows目录解压、启动、记录、停止并重启 | 能否独立完成，记录是否仍在，版本是否正确 |
| Android安装后首次断网启动，建立档案，记录三个日期并修订一天 | 无需账号/首次缓存；日期、历史和待同步状态是否清楚 |
| 使用已有手机录音应用，再取消一次；另选已有合成音频 | 返回与取消能否正常结束，原件归属和导入限制是否明确 |
| 导出加密备份，在另一部手机恢复；尝试错误密码和取消 | 数据/音频/历史完整，错误操作不覆盖档案，设备密钥变化不妨碍密码备份恢复 |
| 配置维护者提供的HTTPS服务，登录并核对患者账号后关联 | 不同账号不能交叉上传；断网重试没有重复记录或静默覆盖 |
| 独立医生账号经审核及患者授权，审阅日记并确认建议；患者反馈后再看摘要 | 权限、建议来源、历史版本和反馈关联清楚；建议不自动成为实际用药 |
| 浏览器/PWA初始化后断网记录三天，关闭重开、恢复连接并重新登录原账号 | 本机记录与服务端入库有区别，原记录保留，无重复或静默丢失 |
| 切换熟悉语言、大字体、读屏及横竖屏 | 字体完整、按钮清楚，阿拉伯语/乌尔都语RTL正确，印地语LTR正确 |

记录完成情况、用时、卡住位置、误填/误解和改进建议。这些是可用性观察，不是疗效数据。无需为完成测试强行填写药物或确认不理解的字段。请勿清除真实资料；备份恢复、取消和清除操作仅使用独立合成测试档案。

### 待真人、真机或外部环境验证

- [ ] 至少一台真实Android手机首次断网安装与使用；随后扩展不同厂商和WebView版本。
- [ ] 手机录音应用成功返回URI、取消及无录音应用时的回退；不同文件管理器。
- [ ] 两台设备之间的密码加密备份恢复；不是仅在同一模拟器清除后恢复。
- [ ] 真实HTTPS域名、证书与代理下的患者关联、同步和医生往返流程。
- [ ] 后台回收、低内存、低存储、长时间离线、设备时钟错误和时区变化。
- [ ] 浏览器/PWA安装与升级、会话过期恢复、换域名前备份与同步。
- [ ] 八语言母语可读性、临床术语与统计规则、安全和可访问性独立复核。
- [ ] 若计划真实患者或机构使用，另行明确授权、隐私、研究伦理和支持责任。

### 可复制反馈格式

    Web/服务端版本：0.8.2
    Android版本（如使用）：0.1.0-preview
    包类型：Windows便携 / 源码 / Android APK
    设备系统、浏览器或WebView及界面语言（无需序列号）：
    入口：电脑浏览器 / 手机浏览器 / PWA / Android离线版
    网络状态（大致描述，无需IP地址）：
    合成任务、复现步骤：
    期望结果 / 实际结果：
    是否完成、用时、卡住位置：
    截图（仅合成数据，已检查无个人信息）：
    建议：

联系 **Junhui Liu M.D. — junhuiliu1025@gmail.com** 或[官方仓库Issues](https://github.com/Alias1027/Multi-language-Headache-Diary--/issues)。安全问题私密反馈。可先发不含附件的简短描述，不要公开数据库、录音、密码、密钥或真实患者资料。公开[测试邀请](TEST_INVITATION.md)不表示已经招募或完成测试。

## English: current status and release order

This is a locally prepared experimental pre-release candidate; this version has not been published to GitHub or an app store. Published 0.6.1/0.7.0 results are historical and do not certify this candidate. See [release notes](RELEASE_NOTES_0.8.2.md) and the [technical release gate](RELEASE_CHECKLIST.md).

**Physical-device acceptance is scheduled after the experimental pre-release, at the maintainer's request, rather than being a prerequisite for it.** Keep “not yet physically device-validated” visible. Invite synthetic-data evaluation; emulator success does not establish clinical readiness, security certification or support for every device.

### Maintainer publication checks

- [ ] Record final-source core/browser and Android build/emulator results, plus preservation of existing data.
- [ ] Verify the separate source ZIP, Windows x64 portable ZIP, Android APK and SHA-256 values. Exclude existing accounts, databases, keys, recordings, backups, QA and private signing material.
- [ ] Verify hosted tests and the Android build for the exact final commit; link actual runs rather than previous-version results.
- [ ] Mark an experimental pre-release, describe the eight languages and device-validation limits, and upload matching assets.
- [ ] Download assets again after publication, verify checksums and update repository/download/CI links.
- [ ] Check private vulnerability reporting, contact details and issue templates; public issues accept only non-sensitive synthetic reproductions.

Unchecked items await confirmation; they do not necessarily mean an artifact is missing. Consult [validation](VALIDATION.md) and the final delivery record.

### After pre-release: invite independent users

Consider 3–5 volunteers, including everyday users, a clinician and suitable native-language reviewers. Each may choose approximately 15–20 minutes of tasks and stop at any time, without disclosing personal health information. This is an initial usability sample, not coverage of all languages/devices or a clinical trial. Personal noncommercial experiments follow the license. **Institutional evaluation, nonprofit institutional use and commercial use require prior written authorization.** The invitation does not waive the license.

Suggested synthetic tasks:

1. Extract the Windows bundle into a new folder, start it, save a record, stop and restart; check version and persistence.
2. Install Android, disconnect before its first launch, create a profile, record three dates and amend one day. Check history and pending status without an account or prior cache.
3. Use the installed recorder, cancel once and select an existing synthetic audio file. Check returned content, cancellation, limits and which app manages the original.
4. Export an encrypted backup and restore on a different phone. Try a wrong password and cancellation using test profiles only; check data/audio/history and recovery-point protection.
5. Link an explicitly reviewed patient account at an operator-provided HTTPS service. Interrupt/retry synchronization; verify no cross-account transfer, duplicate entries or silent overwrites.
6. Use a separately approved and patient-authorized clinician account to review the diary and confirm advice; add patient feedback and inspect the summary. Advice must remain distinct from actual medication use.
7. After browser/PWA initialization, record three offline days, restart, reconnect and sign in to the same account after session expiry. Check browser-only versus server-saved status and retained records.
8. Try a familiar language, large text, screen readers and orientation changes; check complete labels, Arabic/Urdu RTL and Hindi LTR.

Record completion, approximate time, confusion and suggestions. These are usability observations, not treatment outcomes. Do not require medications or confirmation of misunderstood fields. Use isolated synthetic profiles for restoration or deletion exercises.

### Pending physical, human and external checks

- [ ] At least one actual Android phone, followed by different manufacturers and WebView versions.
- [ ] Successful recorder URI return, cancellation, file-picker fallback and different file managers.
- [ ] Password-encrypted backup transfer/restoration between two devices, not only one reset emulator.
- [ ] Deployed HTTPS account linking, synchronization and authorized clinician round trips.
- [ ] Background eviction, low memory/storage, longer offline use, incorrect clocks and timezone changes.
- [ ] Browser/PWA install/update, session recovery and backup/sync before changing origins.
- [ ] Independent review of all eight languages, clinical terms/statistical rules, accessibility and security.
- [ ] Separate authorization, privacy, ethics/research and support arrangements before real-patient or institutional use.

### Copyable feedback format

    Web/server version: 0.8.2
    Android version, if used: 0.1.0-preview
    Package: Windows portable / source / Android APK
    OS, browser/WebView and language (no serial numbers):
    Access: desktop browser / phone browser / PWA / Android offline
    Network condition (general description, no IP address):
    Synthetic task and reproduction steps:
    Expected / actual result:
    Completed?, approximate time and point of difficulty:
    Screenshot (synthetic only, checked for personal information):
    Suggestion:

Contact **Junhui Liu M.D. — junhuiliu1025@gmail.com**, or the [official repository's Issues](https://github.com/Alias1027/Multi-language-Headache-Diary--/issues). Report security concerns privately. Start with a short description without attachments; never publish databases, recordings, credentials, keys or patient information. A public [invitation](TEST_INVITATION.md) does not establish recruitment or completed testing.
