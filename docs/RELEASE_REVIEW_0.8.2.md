# Release review — 0.8.2 / Android 0.1.0-preview

2026-10-23. This is an AI-assisted engineering review of the local prerelease candidate, not independent clinical or security certification. Physical-device acceptance is planned after the experimental prerelease. Final test evidence is in [VALIDATION.md](VALIDATION.md).

## Standards

The review used CONTRIBUTING.md, the existing security/data boundaries and Matt Pocock's locally adapted code-review and diagnosing-bugs workflows. No remaining consequential standard violation was identified in the reviewed Android account, backup/recovery and UI/native boundaries. This is a bounded finding, not a guarantee about every code path.

Existing controls remain: explicit patient account linking and clinician grants, HTTPS-only native network requests, bounded audio imports, encrypted local snapshots, password-encrypted backups, and separate private signing keys. Credentials and existing records are excluded from public assets. Clinical assumptions and automatic statistical rules were not changed.

## Spec

Three reproduced Android behavior defects were fixed:

1. An older server snapshot could replace newer confirmed local cache during account re-linking. A revision guard now rejects the stale snapshot before writing.
2. A startup storage-read failure hid the backup recovery path. Recovery controls remain available without offering a destructive new-profile initialization.
3. Language/navigation changes could replace a form during an in-flight save. Both now respect the existing flush guard and retain the saved note.

The Windows package script previously rejected the two clinician PowerShell launchers. These exact script paths are now included without allowing arbitrary scripts. Package validation also checks every relative guide link, including the fact that the Android APK is supplied separately. Current release-target markers prevent a current document header from masking a stale target version.

The Android CI job verifies Gradle's published checksum and compiles with declared tool versions; it rejects distribution signing secrets and labels its debug artifact as non-distributable test evidence. Local execution and static workflow validation passed. No hosted result is claimed before the actual commit runs.

## Skills and method provenance

- [Matt Pocock skills](https://github.com/mattpocock/skills): code-review and diagnosing-bugs, existing locally adapted edition based on commit `49dd158d1076134a641b33efb035946536778336`. Standards and requirements were reviewed separately; failures were reproduced before narrow fixes.
- [Anthropic webapp-testing](https://github.com/anthropics/skills/tree/main/skills/webapp-testing): inspected the public SKILL.md on2026-10-23 and applied its rendered-page inspection, isolated browser and screenshot-check pattern. Existing project Node/Playwright scripts were reused rather than adding a second Python browser dependency.
- OpenAI's security-best-practices skill was inspected for fit but not selected as a blanket security audit: its stated scope does not cover this native Java component and this task is a release/debug review. No independent penetration test is implied.

These skills supplied review methods, not runtime application dependencies. No third-party skill code, install hooks or model was added to the product. The task did not alter the user's global skill installation or execute unknown third-party helper scripts.

## 中文摘要

按代码规范与需求分别审阅，复现并修复三处Android记录保护问题；修复Windows打包遗漏医生启动脚本，补充使用指南链接和发布目标版本检查，加入不接收正式签名密钥的Android CI编译。患者头痛日记定位、八语言、独立医生授权及已有数据保护保持不变。

本轮使用已核对来源的代码审阅、故障诊断和网页测试方法，不将“明星技能”或自动测试等同于安全、真机或临床认证。真实设备及母语用户验证仍按[预发布后测试清单](RELEASE_PARTICIPATION.md)执行。
