# Interface screenshot record / 界面截图说明 — 0.7.0

Actual application screenshots with isolated synthetic data; no image retouching or invented UI. The eight offline screenshots below were captured on 2026-10-18 in 0.7.0. The twelve `*-061.jpg` images are retained examples from 0.6.1, not new 0.7.0 captures. / 图片均来自真实运行的应用与隔离合成病例，未修饰或虚构界面。下列八张离线截图于2026-10-18在0.7.0中采集；十二张`*-061.jpg`是保留的0.6.1示例，不是0.7.0新截图。

## Current offline queue / 当前版离线记录队列 — 0.7.0

Three dates were saved while offline, followed by a correction to the first date, leaving four ordered pending operations. The same encrypted queue was restored after clearing the browser HTTP cache, closing the browser, and reopening it offline from the service-worker cache. / 断网时保存三个日期，并修订首日，形成四条按顺序待上传的操作；清除浏览器HTTP缓存、关闭浏览器后，仍可通过服务工作线程缓存离线重开，并恢复同一加密队列。

| Language / 语言 | Direction / 方向 | Screenshot / 截图 |
| --- | --- | --- |
| 简体中文 (`zh`) | LTR | [中文离线队列](offline-zh-070.jpg) |
| English (`en`) | LTR | [English offline queue](offline-en-070.jpg) |
| Español (`es`) | LTR | [Spanish offline queue](offline-es-070.jpg) |
| Français (`fr`) | LTR | [French offline queue](offline-fr-070.jpg) |
| Русский (`ru`) | LTR | [Russian offline queue](offline-ru-070.jpg) |
| العربية (`ar`) | RTL | [Arabic offline queue](offline-ar-070.jpg) |
| हिन्दी (`hi`) | LTR | [Hindi offline queue](offline-hi-070.jpg) |
| اردو (`ur`) | RTL | [Urdu offline queue](offline-ur-070.jpg) |

Captured in headless Microsoft Edge (Chromium), using a 390 × 764 CSS-pixel viewport and simulated offline networking. These are browser layout examples, not photographs or acceptance tests of physical phones. All eight languages were checked at the same viewport and all eight screenshots were visually inspected; Arabic and Urdu were verified as RTL. Screenshots contain only the isolated synthetic scenario, without account identifiers or personal health information. / 使用无界面Microsoft Edge（Chromium）、390×764 CSS像素视口及模拟断网采集。这是浏览器排版示例，不是真机照片或真机验收。八种语言均在同一视口检查，八张截图均经逐张检查；阿拉伯语和乌尔都语方向为RTL。截图仅展示隔离合成场景，不含账号标识或个人健康信息。

Reproduce with `node scripts/offline-browser-check.mjs <output-directory>` after installing Playwright; optional `PLAYWRIGHT_MODULE` and `BROWSER_EXECUTABLE` select an existing installation. The script creates and removes only its own temporary synthetic database and browser profile. / 安装Playwright后运行上述脚本复现；可用所列环境变量指定现有安装。脚本只创建及清理其自身临时合成数据库和浏览器配置。

## Retained eight-language overview / 保留的八语言概览 — 0.6.1

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

## Retained feedback and report views / 保留的反馈及摘要 — 0.6.1

These are element captures from version 0.6.1; the application header lies outside their bounds. Text is fictional and bilingual, retained in its original form when switching the interface language. / 以下为0.6.1局部界面截图，范围不包含应用页头。中英文原文均为虚构示例，切换界面语言时保留原文。

| View / 界面 | 中文 | English |
| --- | --- | --- |
| Two separately retained patient responses / 两条独立保留的患者反馈 | [历史反馈](feedback-history-zh-061.jpg) | [Feedback history](feedback-history-en-061.jpg) |
| Report appendix with plan versions, amendment reason and feedback / 含方案版本、修订原因和反馈的摘要附录 | [医生摘要](clinician-summary-zh-061.jpg) | [Clinician summary](clinician-summary-en-061.jpg) |

## Reproduce the retained examples / 复现保留示例

Start 0.6.1 in a new isolated data folder, select **Try synthetic case**, open **My diary**, and keep the overview expanded. Switch languages without editing the case or period. For the new views, transcribe fictional advice, add two feedback entries, enter a simulated clinician plan and amend it, then generate a new report. Never use patient records or existing local accounts for public screenshots.

在新隔离数据目录启动0.6.1，选择“体验合成病例”，展开“我的日记”概览；切换八种语言，不修改病例或统计周期。新增界面示例通过转录虚构方案、添加两条反馈、模拟医生确认及修订方案后生成报告。公开截图不可使用真实患者资料或本机既有账号。

For the original 0.6.1 capture, all eight rendered overview values and direction were checked automatically and all twelve images were visually reviewed. No page script errors or document-level horizontal overflow were observed in that check. These screenshots do not establish native clinical translation accuracy, physical-mobile-device acceptance or clinical benefit. Test scope and historical results remain in [VALIDATION](../VALIDATION.md).

在原0.6.1截图检查中，八语概览数值及方向已自动比对，12张图片已逐张检查，未观察到页面脚本错误或整页横向溢出。这些截图不代表完成母语临床审校、手机真机验收或临床有效性验证。测试范围及既往结论见[验收记录](../VALIDATION.md)。
