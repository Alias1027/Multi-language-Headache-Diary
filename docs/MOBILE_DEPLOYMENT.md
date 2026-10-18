# 手机浏览器与 HTTPS 部署 / Mobile browser and HTTPS deployment — 0.7.0

[中文 README](../README.zh-CN.md) · [English README](../README.md) · [代理配置示例 / Proxy example](../examples/deployment/Caddyfile.example.txt)

## 中文

### 当前范围

本版增加了可选的 HTTPS 反向代理接入模式，便于维护者建立手机可访问的实验服务。患者仍使用浏览器记录头痛，无需安装大模型或完整医院系统。Windows 一键启动仍是仅供电脑本机访问的默认模式；安装包不会自动开放网络端口、创建公网网址、申请证书或安装 Caddy。

**这是一条待维护者部署和真机验收的入口，不是已经上线的手机服务。** GitHub 仓库和 Release 页面提供下载，不托管患者应用。只用合成数据进行受控实验；当前开放注册和模拟邮箱验证不能证明真实身份，医生角色切换仍仅用于合成演示。正式使用前需要相应访问控制、账户管理、监控、备份恢复和运营安排。机构使用仍遵循现有许可。

### 维护者准备

1. 使用 Node.js 24 和独立私有数据目录。不要把本机既有数据目录用于公开实验。
2. 准备受自己控制的域名、DNS、有效 HTTPS 证书和同机反向代理。手机应能够访问这个 HTTPS 网址。代理须作为客户端的第一跳；本示例不支持前置 CDN、隧道或多层代理链。
3. 安装 Caddy 2（本项目未捆绑），复制配置示例到维护者私有部署目录。由维护者完成系统服务、TLS 端口、防火墙和受控参与者访问安排。Node 后端仍仅绑定 `127.0.0.1`，不要改成 `0.0.0.0`。
4. 以下 `diary.example.org` 仅是占位域名，必须替换。`HD_PUBLIC_ORIGIN` 必须是规范的 HTTPS origin，例如 `https://diary.example.org`；不得附带结尾斜杠、子路径、查询参数、账号或密码。当前不支持子路径部署。

在项目源码根目录，Windows PowerShell 示例：

```powershell
$env:HD_DEPLOYMENT_MODE = 'https-proxy'
$env:HD_PUBLIC_ORIGIN = 'https://diary.example.org'
$env:PORT = '8765'
$env:HD_DATA_DIR = 'D:\HeadacheDiaryPilot\private-data'
node server/main.mjs
```

以上需要 Node.js 24 已在 PATH。Windows 便携包也可在确认目录结构后，以其 `runtime\node.exe` 的实际路径替代 `node`。`.env.example` 仅是配置说明，程序不会自动读取它。

Linux / macOS shell 示例：

```sh
export HD_DEPLOYMENT_MODE=https-proxy
export HD_PUBLIC_ORIGIN=https://diary.example.org
export PORT=8765
export HD_DATA_DIR=/srv/headache-diary/private-data
node server/main.mjs
```

在另一个终端为 Caddy 设置**相同**的 `HD_PUBLIC_ORIGIN` 和 `PORT`，然后检查并运行复制的配置（路径按实际位置修改）：

```text
caddy validate --config Caddyfile.example.txt --adapter caddyfile
caddy run --config Caddyfile.example.txt --adapter caddyfile
```

同机代理按示例覆盖 `X-Forwarded-Proto`、`X-Forwarded-Host`、`X-Forwarded-For`，并移除传入的 `Forwarded`。后端只接受同机回环连接、配置的精确 Host、HTTPS 协议、单个有效客户端 IP；不解释任意转发链。修改请求还要求精确匹配的 Origin，登录和退出 Cookie 均添加 Secure。默认本机模式不信任这些头部来改变访问范围。

在代理模式直接访问 `http://127.0.0.1:8765` 会被拒绝，这是预期行为。应通过配置的 HTTPS 网址检查 `/api/health`，其 `mode` 应为 `https-proxy-experimental`。服务器到反向代理的 HTTP 仅在同机回环内；这不等于浏览器到 Node 的端到端 TLS，也不构成临床平台合规认证。

### 患者手机首次使用与离线边界

- 首次打开网址、注册或登录需要服务可达。先在线打开日记并等待页面资源缓存完成，再测试断网；不能首次在完全断网状态下创建账号。
- 使用固定的浏览器和 HTTPS origin。更换域名、端口、浏览器、隐私模式或清除网站数据，不能自动带走原浏览器的离线草稿和待同步记录。部署切换前先同步并备份；未同步时不要清除网站数据。
- 已初始化的日记可继续逐日录入并在恢复连接后同步；会话过期时需重新登录同一个账号。报告生成、远端医生反馈和服务器依赖的操作仍需服务可达。详见[患者使用流程](PATIENT_WORKFLOW.md)。
- PWA 安装是可选入口：能否出现“安装应用”或“添加到主屏幕”，取决于手机浏览器和平台。当前未提供原生 APK、App Store 应用或已接入的小程序。
- 静态页面采用版本化缓存优先；未缓存资源的请求最多等待约 4 秒，日记 JSON 请求默认最多约 12 秒。模型转录等长任务另设较长时间。首次缓存仍需下载所有八语言资源；没有声称已实现零流量首次使用。
- 新版本的 Service Worker 等已有标签页关闭后再接管，减少新旧模块混用。更新前先确认记录已保存，然后关闭该网站所有标签页及 PWA 窗口，再重新打开。应用更新只清理旧页面资源缓存，不清除浏览器日记存储。

### 自动验证与人工验收

自动测试覆盖配置拒绝规则、代理请求边界、Secure Cookie 登录／退出、CSRF、默认本机访问、静态缓存与超时，以及升级时缓存清理范围。Caddy 示例已按官方文档核对并验证头部约定；**未在真实域名上申请证书或完成 Caddy 实际部署**。

维护者仍需实际检查：证书链与续期、手机首次注册登录、离线多日保存后恢复、浏览器/PWA 关闭重开、低剩余存储、后台休眠、Wi-Fi/移动网络切换、慢网、八语言字体与 RTL、更新后未同步记录保留。至少使用一台入门级 Android 设备；iPhone/Safari 和不同厂商系统分别验收。受控模拟视口检查不能替代这些真机结果。

## English

### Scope and prerequisites

Version 0.7.0 adds an opt-in HTTPS reverse-proxy entry point for an operator-managed mobile-browser pilot. Patients continue to use a headache diary; no language model or full hospital system is required. The Windows launcher remains local-only. The package does not open public ports, create a hosted URL, obtain certificates or install Caddy. GitHub hosts downloads, not the patient service.

Use synthetic data in a controlled pilot. Registration is open and email verification remains simulated; neither establishes verified identity. Clinician switching remains a synthetic demonstration. Public clinical deployment still requires access control, account operations, monitoring, recovery and operational review. The existing institutional-use license still applies.

Use Node.js 24, a separate private data directory, a domain you control, DNS and trusted HTTPS certificates. Install Caddy 2 separately on the **same trusted machine** as Node. Caddy must be the first proxy reached by clients: this example does not support a preceding CDN, tunnel or forwarding chain. Keep Node bound to `127.0.0.1`. Configure the operator's service management, firewall, TLS ports and participant access separately.

The Windows and POSIX commands above start the backend from the project root. Replace the placeholder `https://diary.example.org` and private data path. `HD_PUBLIC_ORIGIN` must be an exact canonical HTTPS origin with no trailing slash, subpath, query, user name or password. Node.js 24 must be on PATH, or use the portable package's actual `runtime\node.exe` path. `.env.example` is documentation and is not auto-loaded.

In a second terminal, set the same `HD_PUBLIC_ORIGIN` and `PORT`, then validate and run the copied Caddy configuration using the two commands above. The example overwrites forwarding headers, removes incoming `Forwarded`, and keeps the upstream on loopback. The backend checks the exact Host and Origin, HTTPS forwarding, the loopback peer, and a single valid client IP; it does not trust arbitrary forwarded chains. Session creation and deletion use Secure cookies in proxy mode. Default local mode remains unchanged.

Direct HTTP access to the backend is intentionally rejected in proxy mode. Check the configured HTTPS URL's `/api/health`; its mode should be `https-proxy-experimental`. The proxy-to-Node HTTP hop remains local to the machine. This is not browser-to-Node end-to-end TLS or a clinical compliance certification.

### First use, offline access and updates

- Initial access, registration and login require the service. Open the diary online and let the shell finish caching before testing disconnection; first-time offline account creation is unavailable.
- Keep a stable browser and origin. Changing host, port or browser, using private mode, or clearing website data does not migrate local drafts or queued entries. Synchronize and back up before a deployment move; do not clear data while records are pending.
- Once initialized, the diary supports daily offline entries and later synchronization. An expired session requires login to the same account. Reports, remote clinician feedback and other server-dependent actions still require the service. See the [patient workflow](PATIENT_WORKFLOW.md).
- PWA installation is optional and browser-dependent. No native APK, App Store application or connected mini-program is supplied.
- Versioned static files use cache-first loading; an uncached resource has an approximately four-second network limit. Diary JSON requests use a twelve-second default; long model tasks use a separate longer limit. Initial caching still downloads all eight language resources.
- A new Service Worker waits for existing tabs to close before activation. Save records, close all site tabs/PWA windows, then reopen to update. Only obsolete app-shell caches are removed; diary storage is not cleared by the update.

### Validation still required

Automated tests cover configuration rejection, proxy boundaries, secure session creation/deletion, CSRF, unchanged local access, static cache timeouts and update cleanup. The Caddy example was checked against official documentation and its header contract is tested. **No real-domain certificate issuance or actual Caddy deployment has been completed.**

Operators and testers must verify certificate chains/renewal, first mobile login, multi-day offline recording and reconnect, browser/PWA restart, low storage, background suspension, Wi-Fi/cellular switching, slow links, eight-language fonts/RTL and preservation of pending records across updates. Include an entry-level Android device; test iPhone/Safari and vendor platforms separately. Simulated narrow viewports are not real-device validation.

## Configuration references

- [Caddy reverse proxy and forwarded-header behavior](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy)
- [Caddy placeholders and environment variables](https://caddyserver.com/docs/caddyfile/concepts)
- [Caddy automatic HTTPS prerequisites](https://caddyserver.com/docs/automatic-https)
