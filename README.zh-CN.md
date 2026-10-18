# Headache Diary Lab · 头痛日记

**面向头痛记录与医患随访的八语言本地实验原型。**

简体中文 · [完整英文说明 / Full English README](README.md) · **0.6.1 实验性预发布版** · Node.js 24 · [源码可见许可](LICENSE)

**2026-10-18 已发布：** [官方仓库](https://github.com/Alias1027/Multi-language-Headache-Diary--) · [v0.6.1 实验预发布版](https://github.com/Alias1027/Multi-language-Headache-Diary--/releases/tag/v0.6.1) · [发布标签自动测试结果](https://github.com/Alias1027/Multi-language-Headache-Diary--/actions/runs/39118500923)。Ubuntu 与 Windows 各通过137项自动测试，以及发布检查、源码打包与解压核验。101项浏览器检查是此前本机合成数据证据，不属于远程 CI。

本项目将每日状态、头痛发作、实际用药及经人工核对的语音辅助输入整合为一个患者页面，生成保留漏填信息与记录覆盖率的随访摘要，并提供医生评估、模拟治疗方案及回访工作区。

当前用于合成病例演示与工程验证。译文、模型准确性及临床结局尚未完成独立验证；邮箱和医院接收端为本地模拟，小程序目录为接口准备代码。


## 亮点：Windows一键启动、浏览器直接使用与可选小程序、PWA入口

**降低患者和医生的试用门槛，让记录入口更容易找到。** Windows便携交付包提供一键启动；浏览器是主要使用方式，小程序和PWA作为可选入口。各入口的当前状态如下，不代表全平台部署已完成。

| 入口 | 当前可用 | 待部署、待验证 |
| --- | --- | --- |
| **Windows一键启动** | 完整便携交付包含运行环境，双击启动并打开浏览器；本机启动/停止流程已验证。 | 此入口属于单独准备的Windows便携包；GitHub纯源码包不含运行环境和根目录启动入口，需先配置Node.js 24。 |
| **浏览器直接使用** | 电脑本机浏览器可用；手机可选择浏览器方式，无需下载手机APP或先安装PWA。 | **手机方式需先部署服务**：当前包仅允许电脑本机访问，需部署适配和手机可访问的HTTPS网址，之后完成真机验证。 |
| **可选小程序入口** | 已提供微信、支付宝、抖音网页容器入口准备代码。 | 待服务部署、平台构建、准入审核、业务域名配置及真机扫码验证；尚无已上线小程序。 |
| **可选PWA入口** | 已有应用清单（Manifest）、页面缓存和加密草稿基础。 | 各设备安装体验待验证，手机使用需先部署服务；安装后仍需后台服务，不等于完全离线应用，也不会自动启用真实推送。 |

使用步骤见[中文指南](docs/USER_GUIDE.zh.md#多入口使用亮点与当前范围)，小程序接入范围见[入口准备说明](miniapps/README.md)。便携交付中的“开始使用”页面提供设备指引。默认本机演示无需另装数据库或语音模型。

## 0.6.1：历史反馈与可追溯摘要

- **逐条查看历史反馈：** 按方案版本、来源和时间回看患者各次反馈，方案调整后仍保留此前内容。
- **方案与反馈进入医生摘要：** 生成摘要时保存治疗方案、调整记录与患者主观变化的快照；既有报告保留生成时内容。建议和反馈不会自动成为实际服药记录。
- **围绕患者日记完善：** 医生身份与治疗方案仍为模拟，提醒和医院投递仍是本机演示；本次更新不启用语音模型或真实临床服务。

详见[患者工作流](docs/PATIENT_WORKFLOW.md)、[代表性同类产品比较与发布取舍](docs/PRODUCT_COMPARISON.md)及[各版本验证记录](docs/VALIDATION.md)。比较使用第一方资料，吸收适用的交互和报告优点，不声称全网首创或临床效果优于竞品。本项目采用源码可见许可，非OSI开源。

**0.6.1 核验：** [Ubuntu 与 Windows 远程 CI](https://github.com/Alias1027/Multi-language-Headache-Diary--/actions/runs/39118500923) 各通过137项自动测试及发布／打包检查；此前本机完成101项合成数据浏览器检查。详见[验收与边界](docs/VALIDATION.md)。

### 新功能示例

| 逐条历史反馈 | 包含方案和反馈快照的医生摘要 |
| --- | --- |
| [![0.6.1 合成病例逐条反馈历史](docs/screenshots/feedback-history-zh-061.jpg)](docs/screenshots/feedback-history-zh-061.jpg) | [![0.6.1 含随访历史的合成医生摘要](docs/screenshots/clinician-summary-zh-061.jpg)](docs/screenshots/clinician-summary-zh-061.jpg) |

以上仅使用合成内容。详见[截图来源](docs/screenshots/README.md)；截图展示界面，不代表临床有效性验证。

## 0.6.0：以患者日记为中心

产品定位为**患者头痛记录系统**。新增患者转录医生已告知方案、注明建议来源、保留修订版本，以及实际开始日期、主观变化、执行困难和疑似不良反应反馈。患者转录与模拟医生确认明确区分，两者均不生成实际服药记录。

按患者填写的实际开始日期，回顾前后各28天的日记，同时呈现可观察完整日和缺失情况；不自动判断疗效或因果。语音文字候选支持逐项取舍；涉及建议、计划或既往方案的用药描述保留为原文，待人工区分，未确认的剂量/单位不自动补全。

**仅保留语音识别数据接口、兼容适配与拓展说明，不附带或启用语音模型、Python识别环境或云密钥。** 未接入识别服务时，仍可使用文字整理及人工复核。完整病历、SOAP/DART、自动诊断、电子处方及EHR/HIS写入不在本产品范围。见[患者工作流与边界](docs/PATIENT_WORKFLOW.md)。

## 亮点功能：患者自主提醒

**让提醒配合患者的生活节奏，为持续记录提供支持。** 患者可自行设置每周提醒日、每日时间及时区、消息语言和内容，并在“设置 → 提醒”中随时调整或关闭。

- **个性化且少打扰：** 免打扰时段、暂停日期、当天状态填写完整后跳过，以及每日去重，减少不必要的重复提示。
- **提醒与临床共享分开：** 主动授权后启用，联系方式与提醒历史在本机加密保存，不进入医生摘要和临床共享数据。
- **可演示、可扩展：** 可测试已保存的计划并查看提醒历史；网页内提示、邮件、短信、PWA、微信和支付宝均有模拟渠道，预留后续真实接入边界。

**当前状态：所有渠道均为本机模拟，不向外发送。** 真实渠道仍需配置、账号绑定及相应授权。支持持续记录是设计目标，尚未验证对患者依从性或临床结局的改善。详见[提醒说明与接口](docs/REMINDERS.md)。

**0.6.0 本地核验：**122项自动测试与71项浏览器检查通过，均使用合成数据。技术通过不代表临床效果或模型识别准确率；详见[验证记录](docs/VALIDATION.md)。

## 主要功能

- **患者自主提醒（亮点）：** 自选时间、语言和内容，支持免打扰、暂停及完成后跳过；当前为本机模拟，详见上方说明。
- **连续患者记录页：** 每日状态、疼痛部位与性质、时间、伴随症状、疑似诱因、急性用药、预防治疗及活动影响；未填写的初始表单不自动生成记录。
- **可复核的摘要：** 分别统计头痛日、发作次数与用药日，明确缺失、未知、跨午夜、记录修订与统计周期的处理规则。
- **八语言界面与报告：** 中文、英语、西班牙语、法语、俄语、阿拉伯语、印地语、乌尔都语。印地语从左至右（LTR），阿拉伯语和乌尔都语从右至左（RTL）；切换界面不改写既有报告与原始备注。
- **需人工确认的语音辅助：** 录音或上传音频，本地加密保留原件，将中英文文字整理为待核对字段。提供本机及可选云端适配接口，不附带模型或密钥。
- **模拟随访流程：** 医生评估 → 模拟治疗方案 → 回访，支持确认、修订及患者反馈；建议方案不会自动变为实际用药记录。
- **共享流程实验：** 独立授权、加密数据包、模拟接收端、回执、重复提交去重、重试与撤销后续共享；可导出 JSON 与有限的 FHIR R4 示例。
- **离线草稿：** 首次成功访问后支持浏览器加密草稿及待同步队列。仅适用于可信本机环境，加密不能防护已解锁或被入侵的设备。

## 患者与医生使用流程

| 工作区 | 使用方式 |
| --- | --- |
| **我的日记** | 查看概览，填写当天状态以及相关发作、用药信息，核对后一次保存；未填写的初始表单不计入记录。 |
| **语音录入** | 打开浮窗，录音、上传音频或输入中英文文字；核对候选字段及对应原文后再填入。自动转写需配置识别接口。 |
| **报告与随访** | 选择日期和报告语言，生成摘要；在模拟医生工作台依次体验评估、模拟治疗方案及回访。 |
| **设置** | 配置自主提醒与模拟测试，管理语言偏好、数据导出及授权／回执演示；默认演示不会向真实医院发送数据。 |

页面顶部的语言选择器用于切换界面。未单独设置报告偏好或本次报告语言时，新报告跟随界面语言；已生成报告和原始自由文本保留各自的语言。

## 获取0.6.1

两种干净 ZIP 及 [SHA-256 校验文件](https://github.com/Alias1027/Multi-language-Headache-Diary--/releases/download/v0.6.1/SHA256SUMS.txt) 已在 [v0.6.1 预发布页面](https://github.com/Alias1027/Multi-language-Headache-Diary--/releases/tag/v0.6.1) 的 Assets 中提供。GitHub 自动生成的 Source code 压缩包与以下两个手工准备的 ZIP 不同。

| 文件 | 适用对象 |
| --- | --- |
| [headache-diary-windows-x64-0.6.1.zip](https://github.com/Alias1027/Multi-language-Headache-Diary--/releases/download/v0.6.1/headache-diary-windows-x64-0.6.1.zip) | Windows x64用户；包含运行环境、Start/Stop入口和“开始使用”，无需全局安装Node。 |
| [headache-diary-source-0.6.1.zip](https://github.com/Alias1027/Multi-language-Headache-Diary--/releases/download/v0.6.1/headache-diary-source-0.6.1.zip) | 开发者或自行配置环境的用户；需Node.js 24，不包含便携运行环境和启动入口。 |

两种包均不含既有账号、记录、音频和密钥。将Windows包**全部解压**至有写入权限的新文件夹，双击 `Start.cmd`，选择“体验合成病例”；保存后用 `Stop.cmd` 结束。详见[下载与首次使用](docs/WINDOWS_PORTABLE.md)和[真人发布清单](docs/RELEASE_PARTICIPATION.md)。当前仅核验本机Windows流程；手机浏览器部署、PWA安装和小程序上线仍有上方列出的边界。

本次为发布后的文档状态更新。v0.6.1 标签、已上传的两个 ZIP 及其校验值保持不变；压缩包内较旧的发布状态措辞以当前在线说明为准。

## 欢迎参与体验测试

欢迎感兴趣的用户使用合成案例，反馈难懂、难找、难操作的地方，以及语言和可访问性问题。无需编程经验或个人健康信息，可随时停止；这是软件可用性体验，不是临床试验。详见[双语测试邀请](docs/TEST_INVITATION.md)及[任务和反馈模板](docs/RELEASE_PARTICIPATION.md)。联系 **Junhui Liu M.D. — [junhuiliu1025@gmail.com](mailto:junhuiliu1025@gmail.com)**，或[本仓库 Issues](https://github.com/Alias1027/Multi-language-Headache-Diary--/issues)。机构及商业评估仍须事先书面授权，邀请不构成许可豁免。

## 从源码启动

安装 **Node.js 24.x**。默认演示无需安装 npm 运行依赖、独立数据库、模型或 API 密钥。

```sh
node --version
npm test
npm run check:release
npm start
```

打开 **http://127.0.0.1:8765**，选择 **体验合成病例**。每次选择此入口都会建立新的独立合成账号。按 Ctrl+C 停止服务，记录默认保留在 `../data/`。服务仅监听本机回环地址；`.env.example` 是配置说明，不会自动加载。

另行准备的 Windows 便携目录提供 `Start.cmd`、`Stop.cmd`、`Test.cmd` 及运行环境。GitHub 源码本身不依赖这些启动器。详见[中文使用说明](docs/USER_GUIDE.zh.md)。

## 五分钟演示

1. 打开合成病例的“我的日记”。2026 年 9 月 1–28 日固定示例：**记录 23/28 天、头痛 8 天、发作 7 次、急性用药 5 天，覆盖率 82.1%**。
2. 切换语言，查看印地语 LTR、乌尔都语 RTL；结构化含义和统计数值保持不变。
3. 在“报告与随访”选择周期、生成摘要，也可单独选择报告语言。
4. 进入模拟医生工作台，查看评估、方案和回访，再返回患者视图。
5. 在语音浮窗输入中英文文字，核对候选及原文依据后填入表单。自动转写需另行配置适配器。

## 八语言界面示例

以下八张截图均于 **2026-10-18** 从 **0.6.1** 的独立合成病例中实际截取，展示相同的患者概览、统计周期（2026-09-01 至 2026-09-28）和浏览器视口。点击图片可查看原图。

各语言都显示 **8 个头痛日、7 次发作、5 个急性用药日、23/28 天记录及 82.1% 覆盖率**。LTR 表示从左至右，RTL 表示从右至左；阿拉伯语和乌尔都语使用 RTL，印地语使用 LTR。

| 中文 · 简体中文 · `zh` · LTR | 英语 · English · `en` · LTR |
| --- | --- |
| [![0.6.1 中文合成病例患者概览](docs/screenshots/patient-zh-061.jpg)](docs/screenshots/patient-zh-061.jpg) | [![0.6.1 英语合成病例患者概览](docs/screenshots/patient-en-061.jpg)](docs/screenshots/patient-en-061.jpg) |

| 西班牙语 · Español · `es` · LTR | 法语 · Français · `fr` · LTR |
| --- | --- |
| [![0.6.1 西班牙语合成病例患者概览](docs/screenshots/patient-es-061.jpg)](docs/screenshots/patient-es-061.jpg) | [![0.6.1 法语合成病例患者概览](docs/screenshots/patient-fr-061.jpg)](docs/screenshots/patient-fr-061.jpg) |

| 俄语 · Русский · `ru` · LTR | 阿拉伯语 · العربية · `ar` · RTL |
| --- | --- |
| [![0.6.1 俄语合成病例患者概览](docs/screenshots/patient-ru-061.jpg)](docs/screenshots/patient-ru-061.jpg) | [![0.6.1 阿拉伯语合成病例患者概览](docs/screenshots/patient-ar-061.jpg)](docs/screenshots/patient-ar-061.jpg) |

| 印地语 · हिन्दी · `hi` · LTR | 乌尔都语 · اردو · `ur` · RTL |
| --- | --- |
| [![0.6.1 印地语合成病例患者概览](docs/screenshots/patient-hi-061.jpg)](docs/screenshots/patient-hi-061.jpg) | [![0.6.1 乌尔都语合成病例患者概览](docs/screenshots/patient-ur-061.jpg)](docs/screenshots/patient-ur-061.jpg) |

**支持范围：** 八种语言均有界面与报告选项；语音识别及结构化提取目前仅提供中英文接口，需自行配置识别服务并人工核对。截图是界面展示，不代表已完成母语临床审校或患者可用性验证。参见[截图来源与复现方法](docs/screenshots/README.md)和[多语言说明](docs/LOCALIZATION.md)。

## 检查与源码打包

`npm test` 验证合成临床案例、HTTP、权限、语言、模型接口、离线与打包边界；`npm run check:release` 检查当前文档版本、相对链接、源码边界与离线资源。[v0.6.1 标签工作流](https://github.com/Alias1027/Multi-language-Headache-Diary--/actions/runs/39118500923) 已在 Ubuntu 和 Windows 通过。后续提交状态请查看 [Actions](https://github.com/Alias1027/Multi-language-Headache-Diary--/actions)；此处链接的发布结果明确对应 c1644cd。

使用 PowerShell 打包（Linux 需 PowerShell 7）：

```powershell
pwsh -File scripts/package.ps1 -Destination ../headache-release
```

目标目录必须为空且在源码目录之外。输入目录混入私密或运行数据时会拒绝打包；运行后请将 `data/` 存放在公开源码目录之外，或使用干净检出打包。`SHA256SUMS.txt` 包含源码与 ZIP 校验值；执行 `node scripts/verify-manifest.mjs ../headache-release` 可检查缺失、篡改或多余文件。

[可复制的GitHub短简介与主题标签](docs/GITHUB_ABOUT.md)

| 文档 | 内容 |
| --- | --- |
| [项目工作报告](docs/PROJECT_REPORT.md) / [完成情况](docs/IMPLEMENTATION_STATUS.md) | 临床设计、当前能力与后续任务 |
| [数据字典](docs/DATA_DICTIONARY.md) / [架构](docs/ARCHITECTURE.md) | 统计定义、来源、存储与接口边界 |
| [语音功能](docs/VOICE_INTEGRATION.md) / [模型接口](docs/MODEL_INTEGRATION.md) | 接口、授权及人工核对 |
| [多语言说明](docs/LOCALIZATION.md) | 八语言目录、排版方向及待审校事项 |
| [验收记录](docs/VALIDATION.md) / [发布检查](docs/RELEASE_CHECKLIST.md) | 验证证据与发布门槛 |
| [贡献指南](CONTRIBUTING.md) / [安全说明](SECURITY.md) / [依赖说明](NOTICE.md) | 协作、安全反馈与许可 |

## 当前边界与下一步

独立临床规则复核、母语审校、患者理解测试、可访问性及安全评审仍待完成。中英文语音与大模型接口目前采用模拟响应验证，未进行真实供应商的准确率基准测试。印地语和乌尔都语界面不代表支持对应语音或 Hinglish。项目不声称诊断准确性、治疗获益或全球人口覆盖率。

真实邮件、医院部署与微信／支付宝／抖音小程序上线需另行实施验收。模拟医生身份不是职业资质认证，模拟方案不是处方。[研究计划](docs/RESEARCH_PLAN.md)列出可测量的后续验证工作。

欢迎通过合成案例贡献临床边界测试、母语审校与可访问性反馈。请准确说明证据，区分已实现功能、未来计划与经过验证的效果。

## English overview

**Headache Diary Lab** is an eight-language, local-first research prototype for recording headache burden and preparing clinician-readable follow-up summaries. A single patient page combines daily status, headache episodes, medication use and reviewed voice-assisted input. Summaries distinguish headache days, attacks, medication days and missing records. A simulated clinician workspace supports assessment, treatment-plan updates and follow-up.

**Get started:** install Node.js 24.x, run `npm test`, `npm run check:release` and `npm start` from the source directory, then open **http://127.0.0.1:8765** and choose **Try synthetic case**. The default demo requires no API key, model download or npm runtime dependencies. Use the language selector to switch among Chinese, English, Spanish, French, Russian, Arabic, Hindi and Urdu; the eight screenshots above show the same synthetic overview.

**Research scope:** interface/report localization covers eight languages. Speech and structured extraction adapters currently cover Chinese and English only, with a configured service and manual review. Email/hospital receivers are simulated, mini-program folders are scaffolds, and clinical outcomes, model accuracy and native clinical translations have not been independently validated.

**License:** source-available for independent personal noncommercial learning and experiments. All institutional and commercial use requires prior written authorization from **Junhui Liu M.D.** Contact [junhuiliu1025@gmail.com](mailto:junhuiliu1025@gmail.com) or the [official project repository](https://github.com/Alias1027/Multi-language-Headache-Diary--). This is not an OSI-approved open-source license.

Read the [full English README](README.md) for features, the patient/clinician workflow, startup, packaging, documentation links and limitations.

## 许可与授权

权利人：**Junhui Liu M.D.**。[许可](LICENSE)允许独立个人的非商业学习与实验；**全部机构及商业用途须事先取得书面授权**，包括非营利机构内部评估。可通过 [junhuiliu1025@gmail.com](mailto:junhuiliu1025@gmail.com) 或[官方 GitHub 仓库](https://github.com/Alias1027/Multi-language-Headache-Diary--)联系。本项目为源码可见，并非OSI认可的开源许可；第三方许可和旧版已授予权利不受追溯影响。见[授权政策](docs/LICENSING.md)。
