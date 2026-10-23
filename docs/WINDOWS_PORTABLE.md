# Windows portable use and upgrade / Windows便携包与升级 — 0.8.2

[Historical v0.7.0 Release](https://github.com/Alias1027/Multi-language-Headache-Diary--/releases/tag/v0.7.0) · [Historical checksums](https://github.com/Alias1027/Multi-language-Headache-Diary--/releases/download/v0.7.0/SHA256SUMS.txt) · [验证 / validation](VALIDATION.md)

当前 0.8.2 便携包为本机预发布候选，尚未发布；上方历史下载不包含本次更新。Android APK 单独提供，不在 Windows ZIP 内。真机验收安排在实验预发布之后。

The 0.8.2 portable package is a local prerelease candidate, not yet published. Historical downloads above exclude this update. Android is supplied as a separate APK. Physical-device acceptance follows prerelease.

## 中文

- Windows x64一键启动选择headache-diary-windows-x64-0.8.2.zip，包含Node.js24、许可、Start/Stop和开始使用；源码包headache-diary-source-0.8.2.zip需自行配置Node.js24。两者不含既有账号、数据、密钥或音频。
- 完整解压至新的可写目录，不要在ZIP内运行。双击Start.cmd后浏览器打开；初次体验可选合成病例，每次都会创建新模拟账号。需要可恢复登录请使用自行注册的实验账号。
- 多日离线记录步骤见[离线指南](OFFLINE_MOBILE.md)。停止服务前先查看待同步状态；未同步时可继续本机记录，但不能生成完整服务端报告。浏览器离线备份与服务器data备份是两件事。
- **升级已有交付**：先导出浏览器待同步记录并完成同步（若有冲突先人工核对），停止服务，备份整个data（包含SQLite及密钥），保留旧程序。更新project和启动/说明文件，保留原data、运行时和网址/端口。不要把空白data覆盖到原记录；变更网址会形成新的浏览器存储空间。
- 浏览器页面更新等待旧标签页关闭；完成保存后关闭本应用标签页，再重新打开。升级不主动删除浏览器IndexedDB。再次核验记录和报告，必要时回退旧project与对应完整备份。
- 默认仅电脑本机使用。手机使用已提供可选HTTPS代理配置，仍需实际部署和真机验收；见[部署说明](MOBILE_DEPLOYMENT.md)。不要将127.0.0.1地址发给手机。

## English

Choose headache-diary-windows-x64-0.8.2.zip for bundled Node.js24, notices, Start/Stop and Start Here. The source ZIP requires your own Node.js24. Neither contains existing accounts, data, keys or recordings. Verify checksums and fully extract into a writable folder. Double-click Start.cmd; every synthetic-demo entry creates another account. Register an experimental account for recoverable sign-in.

Before upgrading, export browser-pending records and sync or review conflicts, stop the service, and back up the complete data directory including SQLite and encryption keys. Preserve the old program. Replace project and launcher/guide files while retaining data, runtime and the same URL/port. Never overwrite existing data with a clean folder. A different origin means separate browser storage. Browser updates wait for old tabs to close; save first, close app tabs and reopen. IndexedDB is not intentionally erased. Verify records/reports after restart; retain a complete rollback copy.

Server backups and browser-pending exports are separate. See [offline guide](OFFLINE_MOBILE.md). Default launch remains host-only. Optional [HTTPS deployment](MOBILE_DEPLOYMENT.md) enables a path for phone browsers; actual hosting and physical-device acceptance remain pending. This is a research pre-release, not a clinical service.
