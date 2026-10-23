# Headache Diary Lab 0.8.2 / Android 0.1.0-preview — Experimental pre-release candidate

Prepared / 准备日期：2026-10-23. [Research pre-release published](https://github.com/Alias1027/Multi-language-Headache-Diary--/releases/tag/v0.8.2); [hosted CI passed](https://github.com/Alias1027/Multi-language-Headache-Diary--/actions/runs/40021043776) for the tagged commit. / [实验预发布版已发布](https://github.com/Alias1027/Multi-language-Headache-Diary--/releases/tag/v0.8.2)，对应标签提交的[远程自动测试通过](https://github.com/Alias1027/Multi-language-Headache-Diary--/actions/runs/40021043776)。

## 中文

本轮继续以患者头痛日记为核心，保留浏览器/PWA与Windows入口，增加Android首次离线使用。患者可连续记录多日、修订历史、导出和恢复密码加密备份；联网后核对并关联自己的患者账号，主动同步至维护者部署的HTTPS服务。医生使用独立账号，经部署者审核和患者授权后审阅，建议、历史反馈及就诊摘要保持关联；不签发处方，不把建议自动记为服药。

Android界面支持中文、英文、西班牙文、法文、俄文、阿拉伯文、印地文和乌尔都文。录音优先调用已有手机录音应用，无可用应用时选择已有音频；不捆绑模型、不自动转写或上传。导入音频加密保存，外部录音原件仍由录音应用管理。

本轮发布材料按不同入口分别准备：源码0.8.2 ZIP、Windows x64便携0.8.2 ZIP、Android 0.1.0-preview APK和SHA-256校验文件。便携包带运行环境；源码使用者需Node.js24。Android本机日记不需要HTTPS或首次联网；只有联网医患协作需要已部署HTTPS服务。没有默认公共服务。

**真机验收安排在实验预发布之后；当前尚未真机验证。** 自动与模拟器检查仅证明所测工程场景。待验证包括实际手机录音返回、两部手机之间的备份恢复、真实HTTPS同步、低内存/长时间离线、八语言母语及独立临床/安全复核。详见[测试清单](RELEASE_PARTICIPATION.md)。提醒仍为模拟；Android尚未移植全部网页报告导出、共享与语音候选工作流。

升级前保留原数据和密钥，并导出浏览器待同步记录或Android加密备份。不要用干净发布包覆盖原数据。历史0.6.1/0.7.0的标签、附件和CI结果保持独立，不作为本版的验证。

## English

This candidate keeps the patient headache diary at its core, retaining browser/PWA and Windows entry points while adding first-launch offline Android use. Patients can record consecutive days, amend history and export/restore password-encrypted backups. When connected, they explicitly review/link their patient account and manually synchronize to an operator-deployed HTTPS service. Clinicians use distinct, operator-approved accounts with patient permission. Advice, historical feedback and visit summaries remain linked; advice does not become an actual dose record or an electronic prescription.

Android supports Chinese, English, Spanish, French, Russian, Arabic, Hindi and Urdu. Recording delegates to an installed recorder, with existing-audio selection as fallback. No speech model is bundled; audio is neither transcribed nor uploaded automatically. Imported copies are encrypted locally; the recorder continues to manage its original files.

Release inputs are separate: source 0.8.2 ZIP, Windows x64 portable 0.8.2 ZIP, Android 0.1.0-preview APK and SHA-256 checksums. The portable bundle includes the runtime; source users need Node.js24. The native Android diary needs neither HTTPS nor first-use connectivity for local recording. Connected clinician collaboration needs a deployed HTTPS service; none is preconfigured.

**Physical-device acceptance follows the experimental pre-release; the candidate is not yet physically device-validated.** Automated/emulator checks cover engineering scenarios only. Actual recorder returns, cross-phone restoration, real HTTPS synchronization, low-memory/long-offline use, native-language readability and independent clinical/security review remain pending. See the [participant checklist](RELEASE_PARTICIPATION.md). Reminders remain simulated; not every web report-export, sharing or reviewed voice workflow is ported to Android.

Before upgrading, preserve data/keys and export pending browser entries or an Android encrypted backup. Do not overwrite existing data with a clean package. Historical 0.6.1/0.7.0 tags, assets and CI results remain separate from this candidate.

## Evidence and participation / 证据与参与

- [Validation record / 验收记录](VALIDATION.md) · [Android implementation and tested scope / Android范围](ANDROID_OFFLINE.md)
- [Release checks / 发布检查](RELEASE_CHECKLIST.md) · [Synthetic tasks and feedback / 合成测试与反馈](RELEASE_PARTICIPATION.md)
- [Repository / 仓库](https://github.com/Alias1027/Multi-language-Headache-Diary--) · [Actions / 自动检查](https://github.com/Alias1027/Multi-language-Headache-Diary--/actions)

Source-available for personal noncommercial learning/experimentation; all institutional and commercial use requires prior written permission. / 源码可见，个人非商业学习与实验可用，机构及商业用途均须事先书面授权。**Junhui Liu M.D.** · [junhuiliu1025@gmail.com](mailto:junhuiliu1025@gmail.com) · [License / 许可](../LICENSE).
