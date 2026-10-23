# 同类产品比较与发布取舍 / Product comparison — 0.8.2

核验日期 / Reviewed: **2026-10-18**。

## English overview

Headache Diary Lab is a patient headache diary prototype. Its proposed value is the combination of eight-language interfaces and reports, transparent recording coverage, traceable plan and patient-feedback history, and human-reviewed voice-entry interfaces. Tracking, reminders, reports, local storage and voice-assisted entry already appear in other products; this review does not establish global novelty or superior clinical outcomes.

This is a non-exhaustive comparison of representative products using first-party websites, developer store descriptions and original repositories. Competitor apps were not installed or independently tested. Missing website descriptions are not treated as missing features. Version 0.6.1 focuses on individually readable feedback history and report snapshots containing plan versions, adjustments and patient observations. Actual message delivery, verified clinician identity and hospital integration remain outside the demonstrated workflow. The project is **source-available**, not OSI-approved open source; institutional and commercial use requires written authorization.

## 比较范围

本次选择中外代表性产品与公开代码项目，回答“哪些优点适合患者头痛日记、哪些应暂缓”。这不是全网穷尽检索、专利新颖性分析或临床效果比较。来源为运营方、专业学会、医院、开发者商店说明和原始代码仓库；未购买、安装或实测竞品。厂商功能声明不等于独立验证，未公开的功能也不能判定为不存在。

检索包括 Migraine Buddy reports、N1-Headache clinician dashboard、DMKG App/Kopfschmerzregister、Canadian Migraine Tracker、头痛日记小程序/医院、migraine open source 和 voice logging。网页未标明发布日期时，只记录本次核验日期，不使用抓取日期代替发布日期。本项目状态以[实施状态](IMPLEMENTATION_STATUS.md)及[验证记录](VALIDATION.md)为准。

## 代表性产品

| 产品 | 第一方资料可确认的特点 | 适合借鉴的内容与限制 |
| --- | --- | --- |
| **Migraine Buddy** | iOS/Android、云同步、症状/诱因/用药记录和面向就诊的 Migraine Impact Report；高级报告中有天气与模式分析。 | 借鉴就诊报告的信息层次和导出入口。基础记录、报告与多语不是单项首创；不能从商业宣传推断比本项目更准确或隐私更差。[官网](https://migrainebuddy.com/)、[医生报告](https://migrainebuddy.com/for-your-medical-team/)、[高级报告](https://reports.migrainebuddy.com/)。 |
| **N1-Headache** | 官网描述每日因素记录、至少90日后的个体关联分析；医生门户展示日/月统计、用药、基线比较与功能量表。 | 借鉴清楚的观察起点与分母。医生门户页面仍写等待监管批准后启动/重新开放登记，不能笼统称已普遍商用；专有分析方法不直接移植。[FAQ](https://n1-headache.com/patients/faq/)、[医生门户](https://n1-headache.com/healthcare-providers/)。 |
| **DMKG-App 与头痛登记** | 德国专业学会提供免费无广告日记、每日提醒、头痛日补充字段和可下载汇总；登记项目另有患者授权与医生查看、补充、确认和导出流程，并明确不自动解释数据。 | 与患者连续记录定位接近。借鉴简短日常记录、就诊汇总和授权边界；其真实登记与医生资格流程不能与本项目模拟身份等同。[日记介绍](https://www.dmkg.de/patienten/downloads-und-studien/dmkg-app/)、[登记流程](https://www.dmkg.de/fachinformationen-und-studien/)。 |
| **Canadian Migraine Tracker** | 官方介绍英法双语、iOS/Android、简单记录、日历及跨月图形汇总，支持打印、邮件及传真结果；注明无广告、无付费功能。 | 借鉴患者容易完成的短路径及清楚的趋势展示。八语数量不等于优于双语的理解质量。官网现说明已结束维护恢复服务，不能把过去停机当永久缺点。[官方介绍](https://migrainecanada.org/tools/tracker-app/)。 |
| **头痛日记（Qian Kun zhu）** | 开发者商店说明含时间、强度、性质、诱因和位置等20多项、PDF/Excel报告、简繁中文；更新记录涉及用药反应和生活影响。 | 国内详细字段与医生导出已有成熟先例。可借鉴术语解释和日期输入；引用医生观点不等于医院开发或背书。[开发者商店页面](https://apps.apple.com/cn/app/%E5%A4%B4%E7%97%9B%E6%97%A5%E8%AE%B0/id1551096072)。 |
| **国内医院的小程序使用实例** | 呼伦贝尔市人民医院2025-05-29报道指导患者使用头痛日记小程序，辅助了解症状及后续治疗调整。 | 证明“微信入口+日记+医生参考”并非空白；报道没有充分说明运营方、功能、语言及加密，不与任何特定产品强行对应。[医院原文](https://www.hlbryy.com/shows/10/5798)。 |
| **Migraine Logs** | 官网展示 Gemini 语音转结构化记录、可选天气/可穿戴背景和医生PDF，并提供对应商店链接。 | 语音自动填表方向已有产品。可以借鉴少打字和低刺激界面，但不照搬“8秒”“5条后发现模式”等未经独立验证的宣传数字。[官网](https://migrainelogs.com/)、[开发者商店页面](https://apps.apple.com/us/app/migraine-logs-headache-tracker/id6760580852)。 |

公开代码也已有相似设计：[MigraLog](https://github.com/vfilby/migralog)公开发作时间线、用药、离线存储和备份实现；其[官网](https://migralog.app/)与仓库README对报告功能状态的表述存在差异，本次没有实测消除冲突。[Nudgery](https://github.com/K4-713/nudgery)从偏头痛每日记录需求起步，提供自定问题、时间、条件追问和历史记录，适合作为提醒交互参考。这里只参考概念，未复制代码、图片或量表。

## 本项目的优势与差距

以下是基于当前实现的设计价值，不是对全部竞品的优越性判断。

| 方面 | 可展示的价值 | 尚需补齐 |
| --- | --- | --- |
| **记录可信度** | 区分无头痛、未知与漏填，分开统计头痛日/发作数/用药日，保留跨日和修订规则 | 独立临床规则复核、真实患者长期记录测试 |
| **多语使用** | 八语界面与报告，支持RTL/LTR；切换语言不改写原始备注 | 母语临床审校、患者理解与无障碍评估；八语界面不代表八语语音能力 |
| **方案与患者反馈** | 区分患者转录、模拟医生确认和实际服药；保留修订及历史反馈，报告保留生成时内容 | 真实医生身份、患者授权和生产级多方协作；不具备真实处方平台资格 |
| **语音复核** | 中英文候选逐项核对、引用原文、未知剂量不猜测，模型接口可替换 | 默认不运行ASR/大模型；真实噪声、口音和药名识别准确率尚未验证 |
| **本地与可检查性** | 本地加密、数据字典、合成演示、自动测试和源码可见 | 不等于安全认证或已满足任何地区法规；手机访问仍需先部署可达服务 |
| **患者自主提醒** | 自选时间/语言/内容、暂停、免打扰、去重和填写后跳过 | 所有渠道为本机模拟，未验证真实投递与依从性改善 |
| **患者负担** | 单页整合、初始空表单不生成记录、草稿保护 | 页面较长；真实发作期间的完成时间、误填和退出原因尚需测量 |
| **分发与许可** | 可复现的实验性源码包，机构使用范围清楚 | 当前许可为源码可见；所有机构及商业用途需书面授权，不能宣传为OSI开源 |

## 值得突出展示的功能

1. **缺失也看得见的摘要**：同时显示记录覆盖率、未知、缺失和观察分母，避免把漏填解释成无症状。
2. **八语同一数据语义，保留患者原话**：结构化含义保持一致，原始自由文本不被语言切换覆盖；译文仍标注实验状态。
3. **方案、调整和患者反馈可追溯**：分开呈现建议来源、方案版本、实际执行状态及患者主观变化；不让方案自动变成服药事实。
4. **先核对再填入的语音辅助接口**：患者可取舍候选字段，识别服务另行配置，不宣传未经验证的精确识别。
5. **本地优先且可复现的研发原型**：公开规则和合成样例，便于检查、复现及后续研究。

6. **容易开始使用的多入口设计**：Windows便携包一键启动、浏览器直接使用与可选小程序/PWA入口。当前电脑本机可用；手机需部署服务，小程序待平台接入/验证，PWA安装待验收。便携包与GitHub纯源码范围明确分开。这是工程与体验价值，不构成独有创新或已完成全平台部署的证据。

这些功能的组合可形成项目辨识度；不应表述为“全球首创”“临床疗效优于竞品”或“已覆盖全球大多数患者”。提醒可以保留为设计亮点，但须紧邻标注“本机模拟，真实渠道待接入”。

## 本轮吸收的优点

0.6.1 把优化集中在已有患者工作流：**逐条查看历史反馈，以及把方案版本、调整原因和患者反馈纳入生成时的医生摘要快照**。报告便于回看当时的内容，患者主观感受与日记统计仍分别呈现。使用说明同步解释报告、历史记录和模拟服务的边界。详见[患者工作流](PATIENT_WORKFLOW.md)。

这吸收了专业日记产品的“就诊可读”和“长期可追溯”优点，不扩展为病历、病程记录、诊断或处方执行。现有临床共享与FHIR示例不因摘要新增内容而自动扩大授权范围；具体范围以工作流文档为准。当前验收结果以[验证记录](VALIDATION.md)为准，不使用历史版本测试数字证明新版本。

## 后续可评估，不作为本版承诺

| 方向 | 适用理由 | 决定实施前需要的证据 |
| --- | --- | --- |
| 简洁记录模式、常用信息复用 | 减少发作期间输入负担 | 患者完成时间和误填测试。已有默认展开和重要字段要求保持；不擅自重回折叠或用自动填入代替确认 |
| 多月趋势和就诊前问题整理 | 帮助患者和医生快速定位变化 | 相同观察窗、覆盖率和缺失处理规则；图形理解测试 |
| CSV等分析导出 | 减少研究者整理数据的成本 | 字段字典、授权边界、公式注入防护；现有JSON与打印功能仍保留 |
| 一个真实提醒渠道与手机部署 | 比继续增加模拟渠道更能验证日常使用 | 实际服务配置、退订、失败回执、HTTPS访问及真机测试 |
| 母语审校与可用性验证 | 将“支持八语”推进到“患者看得懂” | 临床术语审校、理解访谈、手机/RTL/键盘辅助验证 |

天气预测、穿戴设备、自动诊断/药量建议、未经授权的量表和完整EHR对接暂不作为发布前补齐目标。它们会引入新的数据来源、验证和运维要求，需要独立需求依据。

**发布定位：**完成工程检查后作为实验性预发布（experimental pre-release）供合成数据演示、代码审阅和研究方法讨论。功能可用、临床有效和正式部署是不同层次；当前成果不应称为已经验证的临床成品。
