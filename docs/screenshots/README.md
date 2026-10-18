# Interface screenshot record / 界面截图说明 — 0.6.1

Captured / 截图日期：2026-10-18。Actual application screenshots with isolated synthetic data; no image retouching or invented UI. / 图片均来自真实运行的应用与隔离合成病例，未修饰或虚构界面。

## Eight-language overview / 八语言概览

- Same synthetic case and period, September 1–28, 2026. / 同一合成病例与2026年9月1日至28日统计周期。
- Values in every language: 8 headache days, 7 attacks, 5 acute-medication days, 23/28 recorded days, 82.1% coverage. / 各语言均为8个头痛日、7次发作、5个急性用药日、23/28天记录及82.1%覆盖率。
- Chrome desktop viewport: 1280 × 1200 CSS pixels. Each browser capture includes the header and complete overview card; crop height follows the card's rendered height. The unfinished daily-entry section below is outside the captured region. / 桌面Chrome视口1280×1200 CSS像素，截取页头及完整概览卡片，高度随译文排版变化；下方每日录入区不在截图范围内。

| Language / 语言 | Direction / 方向 | Screenshot / 截图 |
| --- | --- | --- |
| 简体中文 (`zh`) | LTR | [zh overview](patient-zh-061.jpg) |
| English (`en`) | LTR | [en overview](patient-en-061.jpg) |
| Español (`es`) | LTR | [es overview](patient-es-061.jpg) |
| Français (`fr`) | LTR | [fr overview](patient-fr-061.jpg) |
| Русский (`ru`) | LTR | [ru overview](patient-ru-061.jpg) |
| العربية (`ar`) | RTL | [ar overview](patient-ar-061.jpg) |
| हिन्दी (`hi`) | LTR | [hi overview](patient-hi-061.jpg) |
| اردو (`ur`) | RTL | [ur overview](patient-ur-061.jpg) |

## New feedback and report views / 新版反馈及摘要

These are element captures from version 0.6.1; the application header lies outside their bounds. Text is fictional and bilingual, retained in its original form when switching the interface language. / 以下为0.6.1局部界面截图，范围不包含应用页头。中英文原文均为虚构示例，切换界面语言时保留原文。

| View / 界面 | 中文 | English |
| --- | --- | --- |
| Two separately retained patient responses / 两条独立保留的患者反馈 | [历史反馈](feedback-history-zh-061.jpg) | [Feedback history](feedback-history-en-061.jpg) |
| Report appendix with plan versions, amendment reason and feedback / 含方案版本、修订原因和反馈的摘要附录 | [医生摘要](clinician-summary-zh-061.jpg) | [Clinician summary](clinician-summary-en-061.jpg) |

## Reproduce / 复现

Start 0.6.1 in a new isolated data folder, select **Try synthetic case**, open **My diary**, and keep the overview expanded. Switch languages without editing the case or period. For the new views, transcribe fictional advice, add two feedback entries, enter a simulated clinician plan and amend it, then generate a new report. Never use patient records or existing local accounts for public screenshots.

在新隔离数据目录启动0.6.1，选择“体验合成病例”，展开“我的日记”概览；切换八种语言，不修改病例或统计周期。新增界面示例通过转录虚构方案、添加两条反馈、模拟医生确认及修订方案后生成报告。公开截图不可使用真实患者资料或本机既有账号。

All eight rendered overview values and direction were checked automatically; all twelve images were visually reviewed. No page script errors or document-level horizontal overflow were observed. These screenshots do not establish native clinical translation accuracy, physical-mobile-device acceptance or clinical benefit. Historical screenshots were removed from the public package and retained in the private pre-update archive; historical test summaries remain in [VALIDATION](../VALIDATION.md).

八语概览数值及方向已自动比对，12张图片已逐张检查；未观察到页面脚本错误或整页横向溢出。本次不代表完成母语临床审校、手机真机验收或临床有效性验证。旧截图已从公开包移除并留存于本地更新前备份，既往测试结论仍保留在[验收记录](../VALIDATION.md)。
