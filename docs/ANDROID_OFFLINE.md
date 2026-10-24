# Android offline patient diary / Android 离线患者日记

Web/server 0.8.2 · Android 0.1.0-preview · 2026-10-23 · [GitHub research pre-release published](https://github.com/Alias1027/Multi-language-Headache-Diary--/releases/tag/v0.8.2); no app-store release. / [GitHub实验预发布版已发布](https://github.com/Alias1027/Multi-language-Headache-Diary--/releases/tag/v0.8.2)；尚未上架应用商店。

**真机验收安排在实验预发布后进行；当前尚未真机验证。** 预发布用于合成病例工程/可用性体验，不表示临床部署完成。 / **Physical-device acceptance is scheduled after the experimental pre-release; the candidate is not yet physically device-validated.** The pre-release is for synthetic engineering/usability evaluation, not a claim of clinical deployment. See [post-pre-release tasks / 后续任务](RELEASE_PARTICIPATION.md).

## 中文

### 当前实现

- Android 安装包内包含日记界面、八种语言及记录规则。安装后首次启动即可离线建立本机档案，无需邮箱、服务器或首次联网缓存。现有浏览器与 PWA 入口继续保留。
- 复用每日状态、头痛发作、实际用药、预防治疗与活动影响表单。可连续记录不同日期、修订原记录、查看历史；未同步内容保留在本机。
- 八语言为中文、英文、西班牙文、法文、俄文、阿拉伯文、印地文、乌尔都文；阿拉伯文和乌尔都文从右至左。新文字仍需母语用户复核。
- 记录与草稿、导入音频使用 Android Keystore 管理的 AES-256-GCM 密钥加密后写入 SQLite。单个加密快照分块存储，事务写入。账号凭据及网络会话不写入持久存储。请启用手机屏幕锁；本版没有额外的应用 PIN 或生物识别锁。
- 加密备份包含日记、草稿、修订与待同步历史、导入音频、最近下载的医生建议。使用独立密码（至少12字符）、PBKDF2-SHA256（310000次）与 AES-GCM；备份密码丢失无法找回。不包含登录凭据，也不创建或恢复服务器上的医生授权。
- 恢复备份需明确确认，替换本机档案前保留一个本机恢复点。恢复后重新登录同一关联账号；旧备份与服务器冲突时停止上传，保留待处理内容。
- 录音优先调用手机已有录音应用（Android `RECORD_SOUND_ACTION`）。没有可用应用时打开系统音频选择器，也可直接选择既有音频。每条上限10 MB、导入音频总量24 MB；导入副本加密保存在本机。外部录音应用的原件不由本工具管理。不自动转写、上传或捆绑模型。网页端原有录音与扩展接口保留。
- 联网后在“设置与备份”填写已部署的 HTTPS 服务地址，登录自己的患者账号，核对后确认关联；点击“同步日记与建议”上传。保留稳定操作编号、顺序提交和提交后复核，网络中断可重试而不重复添加。医生仍使用独立账号，并须部署者批准与患者单独授权。
- 在设置中核对医生关联码、授权期限和范围。医生建议页可查看已下载的建议、方案与历史反馈；联网时提交患者转录的建议及疗效反馈。医生端继续要求审阅日记、反馈和摘要后确认方案。系统不自动将建议写成实际用药记录。

### 首次安装与使用

1. 将交付目录 `Android离线版` 中的 APK 通过 USB、蓝牙或其他文件传输方式复制到 Android 手机。文件传输不要求日记服务联网。
2. 按手机系统提示允许该文件来源安装，再打开应用。不要关闭系统安全机制；个别厂商可能有额外安装验证要求。
3. 选择语言、开始观察日期和时区，点击“开始离线记录”。建议首次用合成病例测试。
4. 每天选择实际日期，记录后点击“核对并保存本次记录”。关闭并重开应用，核对历史记录。
5. 在“设置与备份”输入备份密码，导出加密备份到你选择的位置。将备份和密码分开保存。卸载应用或清除应用数据会删除本机数据和设备密钥；换机需用加密备份恢复。
6. 只有需要联网医患协作时才配置 HTTPS 服务。当前未提供正式公共服务器。电脑上的 `localhost` / `127.0.0.1` 不是手机可用服务地址。

### 同步边界

一台安装实例仅管理一个患者档案。关联后不能直接改成另一账号，以免交叉上传。首次关联已有数据的账号时，时区、开始观察日期和同日记录须兼容；冲突会阻止关联或上传，不自动覆盖。可改用新的个人患者账号；已有账号的历史合并需部署者先核对，不能通过删掉本机待同步记录“解决”。

日记可完全脱机；账号注册登录、授权、建议刷新和反馈发送需联网。同步由患者主动发起，不承诺后台一直运行。医生只能看到已经同步且授权允许的内容。医生建议离线副本显示下载时间，不能据此推定仍是最新方案。Android 本版未移植全部网页提醒、报告导出、共享或语音候选字段工作流；这些仍由现有网页版本提供。产品仍是患者头痛日记，不是完整病历或处方系统。

### 验证与待验证

已在 Android 15 / API 35、系统 WebView 124 模拟器中验证首次断网启动、三日表单保存、八语言布局、原生加密存储、备份密码校验及恢复点回退。录音调用在没有录音应用的模拟器上进入系统文件选择器，并成功导入一秒合成静音文件。专项同步测试使用隔离的真实本地后端验证授权、医生审阅、建议、反馈及摘要关联；不代表手机真实公网 HTTPS 链路验收。

还需真人/真机完成：Android 9+ 不同厂商与 WebView 版本、低内存和长时间离线、大字体与读屏、手机系统录音返回 URI、不同文件管理器的备份/换机恢复、正式 HTTPS 域名证书下的账号同步与医生往返、时区变化及设备时间错误、母语和临床用语复核。WebView 必须支持 Web Crypto、Web Locks、ES modules 和 structuredClone（建议124或更新版本）；较老系统若缺少这些功能需先更新 WebView。本地验证不等于临床有效性或正式安全认证。

## English

### Available now

The APK bundles the patient diary, all eight languages and shared recording rules. Its first launch works offline, without an account, email, server or prior web cache. Existing browser and PWA versions remain available. Users can record consecutive days, amend records and retain unsynced changes.

Android Keystore protects an AES-256-GCM device key. Diary data, drafts and imported audio are encrypted before being stored in chunked, transactional SQLite snapshots. Enable the phone screen lock; there is no separate application PIN/biometric lock. Online credentials and session cookies are held only in memory.

Portable backups include diary data, drafts, revisions, pending changes, imported audio and downloaded advice. They use a separate password of at least 12 characters, PBKDF2-SHA256 with 310,000 iterations, and AES-GCM. Lost passwords cannot be recovered. Login credentials are excluded; restoring a backup does not grant or restore server-side clinician authorization. Confirmed restoration retains one previous local recovery point. Reauthentication to the same linked account is required before uploading.

Recording delegates to an installed Android recorder using `RECORD_SOUND_ACTION`, with the system audio file picker as fallback. Imported copies are encrypted locally; originals remain managed by the recording app. Limits are 10 MB per file and 24 MB of imported audio in total. No transcription model is bundled and no audio is uploaded automatically. Existing web voice adapters remain available.

Enter your deployed HTTPS service address in Settings & backup, sign in with your own patient account, review the account and confirm linking. Manual synchronization uses stable operation identifiers, ordered submission and acknowledgement verification. Interrupted transfers can be retried. Clinicians still need distinct accounts, operator approval and explicit patient grants. Downloaded advice can be read offline, with its retrieval time displayed; feedback submission and authorization require connectivity. Advice is never silently converted into actual medication use.

### Installation and boundaries

Copy the APK from the delivery folder `Android离线版` to the phone by USB, Bluetooth or another transfer method. Follow the phone's normal installation approval; manufacturer policies may require additional checks. Select a language, observation start date and timezone, then start recording. Export a password-encrypted backup before uninstalling, clearing application data or replacing the phone. Keep its password separately.

There is no preconfigured public service. A computer's localhost address is not reachable as that service from a phone. One installation holds one patient profile. Once linked, another account cannot replace it. Incompatible timezones, observation dates or overlapping records stop linking/sync and preserve local content. Resolve existing-account history deliberately, or use a new personal patient account; never discard pending records merely to bypass a conflict.

This preview does not port every web reminder, report-export, sharing or reviewed voice-candidate workflow. Those remain in the browser version. Sync is manual/foreground, not a promise of continuous background service. This remains a patient headache diary, not a complete medical record or prescribing system.

### Verification and remaining checks

An Android 15/API 35 emulator with WebView 124 was used for first offline launch, three-day form entry, eight-language layout, native encrypted storage, backup password checks and recovery-point rollback. Without a recorder installed, the recording action opened the system picker and imported a synthetic silent WAV. An isolated real local backend verified the diary-to-authorized-clinician-to-feedback-to-summary contract; this is not a real-phone public HTTPS acceptance test.

Still required: Android 9+ manufacturer/WebView compatibility, low-memory and long-offline use, large text and screen readers, recorder return URIs, file-manager export and cross-device restoration, deployed HTTPS login and clinician round trips, timezone/clock changes, independent native-language and clinical review. WebView must support Web Crypto, Web Locks, ES modules and structuredClone (124+ recommended). Older systems may need a WebView update. Local tests do not establish clinical effectiveness or security certification.

## Building / 构建

Build tools are kept outside the source tree on drive D. Use JDK21, Android SDK platform/build-tools36 and Gradle8.13, then run `android/Build.ps1 -ToolRoot <tool-folder> -OutputDirectory <output-folder>`. Release builds require the private `HD_ANDROID_KEYSTORE` and `HD_ANDROID_STORE_PASSWORD` environment variables. `-DebugBuild` creates a separate test application with WebView debugging enabled. Delivered builds are non-debuggable and explicitly request WebView debugging to be disabled; production-device behavior still needs a security check (the userdebug emulator exposes developer facilities). Keep the signing key for future upgrades; never upload it or its password. Source-package checks reject build outputs, APKs and signing keys.

Official references: [Android recording intent](https://developer.android.com/reference/android/provider/MediaStore.Audio.Media#RECORD_SOUND_ACTION), [Android Keystore](https://developer.android.com/privacy-and-security/keystore), [Android SDK tools](https://developer.android.com/studio), [Gradle8.13](https://docs.gradle.org/8.13/release-notes.html).


## 前一阶段本机基线证据 / Prior local preview baseline

以下数字属于本轮发布加固前的Android预览验收，保留为可追溯基线；最终代码的结果见 [test-results.txt](test-results.txt)、[版本验收](VALIDATION.md)及本机最终交付记录。它们不表示本版远程CI或真机检查已完成。 / These counts describe the Android preview before release hardening. Consult the linked results and final delivery record for the final source. They do not establish hosted CI or physical-device acceptance.

- 194/194 core tests; 141/141 browser checks (50 general, 21 patient, 46 clinician, 24 offline).
- 13 native-emulator scenario checks plus final eight-language layout checks passed.
- Android system file export/import passed. After clearing only the synthetic test application, the encrypted backup restored 3 pending operations, 3 history operations and 1 synthetic audio with a newly generated device key.
- APK v2 signature verified; release package is non-debuggable, requests only INTERNET permission, installs and opens offline. System status/navigation bar overlap and narrow-screen navigation wrapping were corrected.
- 本轮不包含真实手机录音应用的完整往返或公网 HTTPS 实测；录音入口在无录音应用时的文件选择兼容路径已经验证。
- 原有桌面/网页库、账号、授权、历史记录及密钥以更新前备份逐表核验；结果见本机交付记录。

## 本轮发布加固 / Release hardening (2026-10-23)

重新关联账号拒绝旧服务器快照，保留较新的本机确认记录；加密档案读取失败时仍可进入备份恢复；保存中阻止语言或页面切换替换表单。最终重建APK完成13项模拟器场景和签名升级保留检查。对应八语言图片已重新采集。完整结果见[当前验收记录](VALIDATION.md)。

Re-linking rejects stale server snapshots without downgrading the confirmed local cache. A vault-read failure retains a backup recovery entry. Language/page switches wait for the active save. The rebuilt APK passed13 emulator scenarios and signed-upgrade preservation; all eight example screenshots were recaptured. See [current validation](VALIDATION.md).

GitHub Actions now includes a separate Android compile job using Java21, SDK36, build-tools36.0.0 and checksum-verified Gradle8.13. The helper scripts and declared toolchain are under `scripts/`. CI refuses release signing credentials and uploads only clearly labeled disposable debug evidence. Workflow static validation and the same build helper passed locally; the future pushed commit must obtain its own hosted run.
