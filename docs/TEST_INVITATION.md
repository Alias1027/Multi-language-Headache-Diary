# Invitation to try Headache Diary Lab / 头痛日记体验邀请 — 0.8.2

## 中文邀请

**欢迎帮助我们把头痛日记做得更容易理解、更容易使用。**

Headache Diary Lab是一款以患者为中心的八语言头痛日记实验原型，汇总每日状态、发作、实际用药与随访反馈。当前Web/服务端0.8.2候选保留多日离线队列、弱网同步和Windows一键启动；Android 0.1.0-preview增加首次离线建档、连续记录、手机已有录音工具入口和密码加密备份/恢复。医生使用独立账号、经部署者审核及患者授权后审阅，保留逐条反馈历史和摘要关联。

如果你对患者记录工具、医学沟通、多语言界面或可访问性有兴趣，欢迎体验并告诉我们哪里难懂、难找或难操作。无需软件工程经验，也不要求提供个人健康信息。可以花约15–20分钟选择几项任务，随时停止或跳过；没有完成次数或持续打卡要求。

**本次只使用应用自带的合成病例或你编写的虚构示例。** 这是软件可用性体验，不是临床试验或诊疗服务，不用于判断个人病情，也不承诺改善头痛或治疗效果。请使用独立合成患者与测试医生账号、虚构建议和反馈；账号审核不等于执业资质认证。消息提醒与机构投递仍为模拟；没有捆绑语音模型或默认公共手机服务。PWA安装、小程序以及真实HTTPS协作仍有待部署或验证事项。

你可以尝试：

- 按说明启动，填写并修改一条虚构日记，再停止和重新打开。
- 查看两条历史反馈，生成摘要，判断日期、用药与建议来源是否容易理解。
- 在熟悉的语言下检查文字、按钮、术语及手机宽度布局；指出译文不自然或含义不清的地方。
- 用已注册的实验账号在线初始化后，断开服务，记录三个不同日期并修订其中一天，再恢复连接，检查待同步提示、数据完整与重复情况。请勿清除网站数据；临时合成演示账号没有可恢复密码，不适合会话过期测试。
- 安装Android APK后首次断网建立合成档案，记录三个日期、重开并查看历史；用系统录音/已有音频入口，导出密码备份并在另一部手机恢复。
- 条件允许时，在维护者提供的HTTPS服务上测试Android关联与同步，分别使用手机浏览器与PWA，记录关闭重开、弱网和低存储时的体验；桌面缩放不算手机真机验证。

本轮体验目标为 **Web/服务端0.8.2与Android 0.1.0-preview实验预发布候选**，当前尚未公开发布本版。使用维护者提供的相应候选附件及SHA-256，按[下载与首次使用](WINDOWS_PORTABLE.md)和[Android指南](ANDROID_OFFLINE.md)核对版本；旧版0.7.0附件不包含本轮新增内容。**真机验收安排在实验预发布后进行，当前尚未真机验证。** 具体任务与反馈格式见[参与测试清单](RELEASE_PARTICIPATION.md)，当前工程结果见[验收记录](VALIDATION.md)。发布邀请不代表已有独立用户完成测试。

欢迎通过 **junhuiliu1025@gmail.com** 联系 **Junhui Liu M.D.**，或在[官方仓库Issues](https://github.com/Alias1027/Multi-language-Headache-Diary--/issues)反馈。请写明版本、系统/浏览器、使用语言、任务步骤和期望/实际结果。截图仅使用合成内容；不要发送真实患者信息、病历、录音、密码、密钥或整个数据目录。安全问题请通过私密渠道反馈。

本项目为**源码可见（source-available）**。独立个人非商业学习与实验遵循现有[许可](../LICENSE)；**所有机构及商业用途，包括非营利机构内部评估，须事先取得作者书面授权**。本邀请不构成许可豁免。欢迎先咨询后参与。

## English invitation

**Help make a headache diary easier to understand and use.**

Headache Diary Lab is a patient-centered, eight-language diary prototype bringing together daily status, episodes, actual medication and follow-up feedback. The current web/server 0.8.2 candidate retains offline queues, weak-network synchronization and Windows one-click startup. Android 0.1.0-preview adds first-launch offline profiles, consecutive-day entries, existing recorder access and password-encrypted backup/restoration. Distinct clinician accounts require operator approval and patient permission; feedback history and summaries stay linked.

If you are interested in patient recording tools, medical communication, language accessibility or usability, we would welcome your observations about what is confusing, difficult to find or hard to use. No software-engineering experience or personal health information is needed. You can spend approximately 15–20 minutes on a few tasks, stop at any time or skip anything; there is no completion or daily-use requirement.

**Use only the included synthetic case or fictional examples.** This is a software-usability exercise, not a clinical trial or medical service. It is not for evaluating your health and does not promise headache relief or treatment benefit. Use synthetic patient/test clinician accounts with fictional advice and feedback; account approval is not verification of professional credentials. Reminders and institution delivery remain simulated. No speech model or public mobile service is bundled. PWA installation, mini-programs and real HTTPS collaboration still require deployment or validation.

You could try:

- Starting from the guide, saving and editing a fictional diary entry, then stopping and reopening the app.
- Reviewing two historical feedback entries and generating a summary, checking whether dates, medication and advice provenance are understandable.
- Reviewing a familiar language, labels, buttons, clinical terms and narrow-window layout, and pointing out unnatural or ambiguous wording.
- Using a registered experimental account, initialize online, disconnect the service, record three dates and amend one day, then reconnect and check the pending status, completeness and duplicates. Do not clear site data; temporary synthetic-demo accounts have no recoverable password and are unsuitable for session-expiry testing.
- Install the Android APK and create a synthetic profile with the network disconnected before first launch. Record three dates, restart, inspect history, try the recorder/audio picker and transfer a password-encrypted backup to another phone.
- If an operator provides an HTTPS pilot, try Android account linking/sync and the mobile browser/PWA separately. Describe restart, weak-network and low-storage behavior. Desktop resizing is not physical-device validation.

This invitation targets the **web/server 0.8.2 and Android 0.1.0-preview experimental pre-release candidate**, which has not yet been publicly released. Use the maintainer-provided matching candidate assets and SHA-256 values; follow [download and first use](WINDOWS_PORTABLE.md) and the [Android guide](ANDROID_OFFLINE.md). Older 0.7.0 assets do not contain these additions. **Physical-device acceptance follows the experimental pre-release; the candidate is not yet physically device-validated.** See the [tasks and feedback template](RELEASE_PARTICIPATION.md) and [version-specific validation](VALIDATION.md). Publishing an invitation does not establish completed independent testing.

Contact **Junhui Liu M.D.** at **junhuiliu1025@gmail.com**, or use the [official repository's Issues](https://github.com/Alias1027/Multi-language-Headache-Diary--/issues). Include the version, OS/browser, language, steps and expected/actual result. Screenshots must contain synthetic information only. Do not send real patient information, medical records, recordings, passwords, keys or a complete data folder. Report security concerns privately.

The project is **source-available**. Independent personal noncommercial learning and experimentation follow [LICENSE](../LICENSE). **All institutional and commercial use, including internal nonprofit evaluation, requires prior written authorization from the author.** This invitation does not waive the license. You are welcome to ask about scope before participating.
