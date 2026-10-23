# Offline diary, mobile and weak networks / 离线、手机与弱网 — 0.8.2

## 中文

本产品仍是患者头痛日记，不是电子病历或处方执行平台。离线能力保护患者自己的每日记录；医生反馈、报告和共享有独立的连接要求。

### 第一次准备

1. 在可信设备上使用支持IndexedDB、Web Crypto、Service Worker和Web Locks的现代浏览器。先启动电脑服务，或取得维护者部署的固定HTTPS网址；手机不能打开电脑的127.0.0.1地址。
2. 首次联网注册或登录，等待日记和页面缓存加载。需要多日保留和重新登录时，请用自行注册的实验账号。每次“体验合成病例”创建独立演示账号，其随机密码不能找回。
3. 在“设置 → 数据”中申请浏览器持久存储。浏览器可能拒绝，界面会显示实际结果。即使获准，清除网站数据、卸载浏览器或设备损坏仍可能丢失本地内容；请另行导出备份。隐私浏览不适合持续记录。

### 断网与恢复

- 填写日期、当天状态和相关头痛/用药字段，核对后保存。可继续填写其他日期，也可修订同一天；不是只允许一条待同步记录。未填写的自动模板不变成发作或用药。
- “待同步记录”列出本机排队内容。未同步数据仍仅位于这个浏览器、这个网址和这个账号；其他手机或医生端尚看不到。
- 页面或浏览器关闭后，在同一浏览器配置与原网址继续；需曾成功缓存。首次完全断网不能注册或登录。缓存不保证永久保存。
- 恢复服务后尝试同步；也可手动同步。连接慢时请求超时，保留待同步操作；同一操作重试不会重复入库。
- 会话过期时用原账号重新登录，仍可继续离线日记。不会把原账号队列转给另一个账号。合成演示会话无法恢复时，先导出待同步内容，保留人工恢复材料。
- 服务端版本冲突或校验失败时停止该队列的上传并显示原因，继续保留数据。不要直接清理或换账号；先导出，与服务端记录核对。当前没有自动合并冲突，也没有一键导入备份的承诺。
- 待同步时先不要生成/共享报告。报告基于服务端已保存数据；本机待同步记录不能冒充医生已收到。方案、疗效反馈、提醒设置及语音服务仍需连接。

尚未提交的填写内容按草稿分别保留。可在“尚未提交的草稿”打开后继续核对；其他标签页正在编辑的草稿会先复制。存在未提交草稿或待同步记录时，不会通过退出或切换账号静默清除；请先保存或明确删除草稿。下载的JSON导出文件未加密，请妥善保管。

### 弱网与手机的范围

缓存页面优先使用；未缓存静态资源的网络等待上限4秒，普通JSON请求上限12秒。页面更新等待旧标签页关闭，避免混合版本；更新不清理IndexedDB。首次缓存仍需下载八语资源，未实现自动网络质量检测或按需语言下载。没有自动上传录音或强制下载模型。

手机浏览器方式现在具备可选部署配置，实际使用前需维护者部署HTTPS服务。PWA安装只是可选入口，不能代替首次初始化或后台同步服务。详见[MOBILE_DEPLOYMENT.md](MOBILE_DEPLOYMENT.md)。

### 仍需真人/真机完成

- 入门Android及iPhone Safari：注册、断网三天、每天记录、关机重启、恢复网络和记录核对。
- 手机浏览器与已安装PWA分别测试：操作系统后台回收、升级、低存储、隐私模式、站点数据清理后的提示和备份流程。
- 慢网/不稳定网络下核对启动时间、流量、操作等待、耗电及录音行为；桌面窄屏模拟不代表低内存设备性能。
- 八语言母语患者验证理解、日期/方向、触控、辅助技术及日记负担；未宣称临床效果或语言等效。
- 部署者完成真实域名/证书、反向代理、访问管理和安全审查；身份、真实通知和机构接入仍未完成。

## English

This remains a patient headache diary, not an EHR or prescribing platform. Offline functionality protects the patient's daily entries; care feedback, reports and sharing have separate connectivity requirements.

### Prepare once

Use a trusted device and a current browser supporting IndexedDB, Web Crypto, Service Workers and Web Locks. Start the local service or obtain a fixed HTTPS address from the operator. A phone cannot use the computer's 127.0.0.1 URL. Register/sign in and let the diary and shell cache load while connected. For repeatable sign-in use a registered experimental account: each synthetic demo creates an independent account with no recoverable password.

Request persistent browser storage in Settings → Data; the browser may deny it. Even a granted request does not protect against clearing site data, uninstalling the browser or losing the device. Keep a separate export and avoid private browsing for continued recording.

### Record and reconnect

Continue saving multiple dates and same-day amendments offline. Untouched starter forms do not become medication or attack records. Pending entries are encrypted in this browser and shown as awaiting sync; another device or clinician cannot yet see them. After closing the page/browser, return with the same profile and origin; prior caching is required. First-time offline registration/sign-in is unavailable.

When the service returns, automatic or manual sync replays stable operation IDs in order. Timeouts retain pending operations; an uncertain acknowledgment is retried without duplication. If the session expires, sign in to the original account while keeping your offline diary. Queues are never transferred to another account. Export a synthetic demo's pending entries if its session cannot be recovered.

Version conflicts and validation errors retain the queue and show the problem. Export and compare with server data before clearing anything; there is no automatic conflict merge or promised one-click backup import. Sync before generating/sharing a report: server summaries exclude unsynced entries. Treatment feedback, reminder settings and voice services still require connection.

Unsubmitted forms are retained as separate recoverable drafts. Open a retained draft to review; a draft being edited in another tab is copied first. Sign-out/account switching cannot silently clear unsubmitted drafts or pending records; save or explicitly discard drafts first. Downloaded JSON exports are not encrypted and need safe storage.

### Network, mobile and pending validation

Cached static pages are served first. Missing static resources have a 4-second network bound; ordinary JSON requests have a 12-second bound. Updates wait for older tabs to close and do not erase IndexedDB. Initial caching still downloads all eight languages; there is no automatic quality detection or on-demand language loading. No speech model or automatic recording upload is required.

Mobile browser use has an opt-in HTTPS deployment configuration, but an operator must actually deploy the service. PWA installation is optional and does not replace initialization or synchronization. See [deployment](MOBILE_DEPLOYMENT.md). Outstanding: entry-level Android/iPhone Safari tests; browser versus installed-PWA lifecycle; shutdown/restart, storage pressure and recovery; slow/unstable-network timing, data, battery and audio measurements; native-language patient comprehension/accessibility; real domain/certificate/proxy/security acceptance. Desktop emulation is not physical-device, clinical or linguistic validation.
