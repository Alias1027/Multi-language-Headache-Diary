# Patient diary workflow / 患者日记工作流 — 0.8.2

> 0.8.2：医生入口与授权流程以 [CLINICIAN_ACCESS.md](CLINICIAN_ACCESS.md) 为准。旧版“模拟角色切换”已移除；下文涉及 v0.7.0 的发布/验证记录属于历史证据。当前新增范围需独立验证，未复用旧 CI 结果。

Updated: 2026-10-18. Experimental; synthetic demonstrations. No full chart or prescription execution.

## 患者如何使用

1. 在“我的日记”记录当天状态、头痛发作和实际用药。医生的建议不代表已经服药。
2. 在“报告与随访 → 方案与执行”查看医生反馈，或展开“记录医生告诉我的方案”，转录已经收到的建议，注明由谁、何时告知。不清楚的剂量或日期留空，不猜测。
3. 对当前方案填写实际执行状态；实际开始后可填写开始日期。已阅读或尚未开始时不填写实际开始日期。选择“有困难”时，可填写原因及原文说明。每次反馈保留为独立记录。
4. 系统按最近一次反馈的实际开始日期呈现前后各28天的日记。今天、未来和登记前日期不作为完整观察日。缺失不计作无症状，不把前后差异归因于方案。
5. 患者转录的修订会保留原版和理由，不获得“医生已确认”身份；医生工作台仍为模拟角色。反馈不会自动生成实际用药、预防治疗或每日依从性记录。
6. 语音浮窗可直接输入ASR文字或手工文字。整理后逐项勾选候选，核对原文，再确认填入日记草稿；填写时间、必需字段后另行保存。取消剂量或单位时不会猜测补全。包含建议、计划、既往用药的混合描述采用保守处理，必要时在日记中手工填写实际服药。

## English workflow

Record daily status and actual events first. Under Reports & follow-up → Plans & implementation, read clinician feedback or transcribe advice already received. Identify the source; unknown amounts and dates stay blank. Patient-authored advice is always labeled as unconfirmed transcription and amendments preserve the original.

Report actual implementation separately: read, started, not started or difficulty, plus the actual start date when known, perceived change and suspected adverse effects. These are patient observations, not verified adherence or automatic medication events. The latest feedback controls the displayed observation anchor; leaving its date blank disables the comparison. Open any dated Feedback history entry to read its full content; previous plan versions retain their own feedback. The authenticated JSON export also retains these entries.

The descriptive diary view uses 28 days before and after the reported actual start. It displays recorded status / eligible complete days and observed symptom, acute-medication and activity-limitation counts. Unequal coverage, missing observations and other simultaneous changes prevent a causal or efficacy claim.

For voice-assisted entry, use existing transcript text or an optional configured ASR adapter. Accept/reject candidates individually, review their quoted evidence, then fill a draft and confirm times and required fields before saving. Original text/audio provenance remains available under the existing retention rules.

## Extension boundary / 扩展边界

- The standard delivery needs Node.js only. No speech model or Python speech environment is included or activated. Local ASR and cloud APIs remain optional adapters; provider-specific compatibility tests use simulated responses, not live clinical accuracy tests.
- OpenAI / DeepSeek / Doubao / Qwen text providers and the documented ASR bridge retain their existing contracts. Configuring a provider is not proof of connectivity or accuracy. Cloud use remains explicit and scoped to the current note.
- A review date and observation focus are displayed as advice. They do not silently activate reminder schedules. Patients manage reminders independently in Settings; delivery remains simulated.
- JSON export includes patient advice and feedback. Existing clinical sharing and limited FHIR examples do not export these new care fields or original audio. A future approved analysis adapter must define consent and schema explicitly.
- No SOAP/DART notes, full longitudinal medical chart, automatic diagnosis/coding, prescriptions, medication orders or EHR/HIS writeback are implemented or targeted by this release.

## Storage and compatibility

`patientPlans` is an additive encrypted care collection; older care records normalize to an empty collection in memory without rewriting them. The server fixes source/status/author for patient submissions and checks ownership, revision, operation ID and amendments. Existing diary schema 1, statistical rule 0.1.0 and glossary 0.2.0 remain unchanged. See [data dictionary](DATA_DICTIONARY.md) and [validation](VALIDATION.md).

## Clinician-summary snapshot / 就诊摘要快照 (0.6.1)

Generate a new summary to capture all published plan versions, amendments, patient feedback, confirmed assessments and non-draft follow-ups at that moment. This care appendix is explicitly independent of the selected diary date window. It contains no clinician drafts or recursive copies of older reports. Printing expands every report history entry; downloading JSON retains the same snapshot. Feedback times use the report time zone; original text is not translated. Later changes prompt regeneration and do not overwrite old reports. Use Refresh follow-up to retrieve service updates; there is no real-time clinical monitoring.

患者与模拟医生可按日期逐条展开反馈。方案修订保留前版关联与原因。新摘要增加生成时已发布的全部随访历史快照，不受日记统计日期筛选；打印与下载包含同一内容。旧报告不被改写，医生草稿不进入患者报告。当前模拟共享仍仅发送日记摘要，不自动扩大授权范围。
