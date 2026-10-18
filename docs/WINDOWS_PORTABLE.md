# Windows portable download and first use / Windows便携包与首次使用 — 0.6.1

## 中文

本地发布材料已准备两种附件，**尚未上传GitHub**。实际仓库创建后，在同一个 `v0.6.1` 实验性预发布（Pre-release）的 Assets 中提供；请核对发布者和校验值，不要从无法确认来源的链接下载。

| 选择 | 文件 | 适用对象与内容 |
| --- | --- | --- |
| Windows一键体验 | `headache-diary-windows-x64-0.6.1.zip` | Windows x64用户；包含应用源码、Node.js运行环境及其许可、Start/Stop入口和“开始使用”。解压后无需全局安装Node，不含既有账号、数据库、音频或密钥。 |
| 纯源码 | `headache-diary-source-0.6.1.zip` | 开发者或希望自行配置运行环境的用户；不含便携运行环境和根目录启动入口，需Node.js 24。解压后的 `project` 是仓库根目录。 |

### 第一次使用便携包

1. 下载Windows x64 ZIP并按发布附件的SHA-256清单核对。**先全部解压**到有写入权限的新文件夹，不在ZIP内直接运行；不要覆盖已有数据目录。
2. 打开 `开始使用/00-从这里开始.html`，或双击根目录 `Start.cmd`。也可从 `开始使用/01-Windows电脑/一键启动.cmd` 启动。两个入口启动同一个本机服务。
3. 浏览器打开 `http://127.0.0.1:8765/` 后，选择“体验合成病例”。每次选择都会新建独立模拟账号；勿输入真实患者资料。
4. 保存一条合成日记，生成医生摘要，再查看方案与反馈历史。自动语音转写未启用，可先用中英文文字体验人工复核。
5. 确认记录已保存且无待同步项目后，双击 `Stop.cmd`。重新运行 `Start.cmd`，在同一浏览器继续原会话。合成演示不会提供可重新输入的邮箱/密码，请勿为继续演示而退出或清理站点数据；会话失效时可重新体验新合成病例，要保留结果请先导出。只有自行注册的实验账号才使用自己设置的邮箱和密码登录。停止服务不会删除已保存记录，但不保证失效的演示会话可以找回。

首次运行才会在便携包旁的 `data/` 建立本机数据和密钥。不要把使用后的整个文件夹转发给其他测试者；请转发原始干净ZIP。升级前停止服务并备份整个 `data/`，数据库与密钥须一起保留。便携运行环境不等于Windows代码签名；遇到系统拦截时先确认来源、校验值及提示，不要关闭安全软件。

**当前范围：** 只核验当前Windows本机流程，不代表所有Windows设备兼容。手机浏览器需先部署可访问的HTTPS服务；PWA安装、小程序接入及真机测试仍待完成。当前仅监听本机地址，不能将电脑的localhost链接直接交给手机使用。模拟提醒不外发，医生身份与方案不是正式医师认证或处方。

源代码启动步骤见[中文README](../README.zh-CN.md#从源码启动)。完整操作见[中文使用指南](USER_GUIDE.zh.md)；测试任务和待真人工作见[发布与参与清单](RELEASE_PARTICIPATION.md)。

## English

Two local release assets are prepared; **they have not been uploaded to GitHub**. Once the repository exists, both are intended for the same `v0.6.1` experimental pre-release. Check the publisher and the accompanying SHA-256 checksums before use.

| Choose | File | Intended use |
| --- | --- | --- |
| Windows one-click trial | `headache-diary-windows-x64-0.6.1.zip` | Windows x64; includes source, the Node.js runtime and notices, Start/Stop launchers and Start Here guides. No global Node installation is needed. No existing accounts, databases, recordings or keys are included. |
| Source only | `headache-diary-source-0.6.1.zip` | Developers and users configuring their own runtime. Requires Node.js 24; excludes the portable runtime and root launchers. The extracted `project` directory is the repository root. |

### First use of the portable bundle

1. Check the Windows ZIP against the supplied SHA-256 list. **Extract all files** into a new writable folder; do not run inside the ZIP or overwrite an existing data folder.
2. Open `开始使用/00-从这里开始.html` for the device guides, or double-click the root `Start.cmd`. The alternative Chinese launcher in `开始使用/01-Windows电脑/` starts the same service.
3. At `http://127.0.0.1:8765/`, choose **Try synthetic case**. Each use creates a separate simulated account. Enter synthetic information only.
4. Save a synthetic diary entry, generate a clinician summary, and review plan and feedback history. Automatic speech transcription is not enabled; typed Chinese/English input supports the manual-review demonstration.
5. Confirm that records are saved with no pending synchronization, then double-click `Stop.cmd`. Restart with `Start.cmd` in the same browser session. The synthetic demo does not supply reusable email/password credentials: do not sign out or clear site data to continue the same demo. If its session expires, start a new synthetic case; export any results you want to retain beforehand. Only a separately registered experimental account can sign in with the email/password you chose. Stopping preserves saved records but does not guarantee recovery of an expired demo session.

The first run creates local `data/` and keys within the portable folder. Share the original clean ZIP, not your used folder. Before an upgrade, stop the service and back up the complete `data/` folder, including keys. The bundled runtime does not imply Windows code signing; verify the source, checksums and any security prompt instead of disabling protection.

**Scope:** the current host's Windows workflow has been checked; compatibility across all Windows devices has not. Mobile browser access needs a deployed reachable HTTPS service. PWA installation, mini-program integration and real-device checks remain pending. The local service accepts loopback access only. Reminders do not send real messages, and simulated clinician identities/plans are not verified clinical credentials or prescriptions.

See [source startup](../README.md#quick-start-from-source), the [release and participation checklist](RELEASE_PARTICIPATION.md), and the [testing invitation](TEST_INVITATION.md). Personal noncommercial experiments follow [LICENSE](../LICENSE); all institutional and commercial use requires prior written authorization.
