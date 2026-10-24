# 医生入口与患者授权 / Clinician access — 0.8.2

## 中文

本功能已随[0.8.2实验预发布版](https://github.com/Alias1027/Multi-language-Headache-Diary--/releases/tag/v0.8.2)公开；真机与实际部署尚待验证。患者端仍用于头痛日记；医生入口只用于审阅、建议和随访记录，不是完整病历或电子处方平台。账号批准不等于医师执业资质认证；部署者负责线下核对身份及使用资格。

### 1. 医生使用独立账号

打开同一服务地址的 `/clinician.html`（本机默认 `http://127.0.0.1:8765/clinician.html`）。填写医生邮箱、独立密码（至少 12 个字符）及显示姓名，点击“申请医生账号”。不能使用患者账号；同一邮箱不能同时注册两种角色。申请后，先联系部署者审核，再登录。

部署者在项目目录运行以下命令。数据目录必须指向对应服务，不能混用主库和预览库：

```powershell
..\runtime\node.exe scripts/clinician-account.mjs list ..\data
..\runtime\node.exe scripts/clinician-account.mjs approve ..\data doctor@example.invalid
```

将示例邮箱改为实际申请邮箱。审核不是自动批准；命令仅供拥有服务器文件权限的部署者使用，没有公开管理接口。`suspend` 暂停账号并注销会话；`reset-password` 生成新随机密码并注销会话，只应私下交付，不能放进 GitHub、截图或公开日志。旧模拟医生账号保留原记录，但默认不能进入独立入口；需单独审核和重置不可知的旧密码，患者仍须重新授权。

### 2. 患者授权

医生登录后将“医生关联码”私下提供给患者。患者打开“设置 → 医生访问授权”（也可从“医生建议与随访”的“管理授权 / 关联我的医生”快捷进入），输入关联码，核对姓名，填写供医生识别的称呼，选择 7 / 30 / 90 天，勾选授权范围后确认。关联码本身不代表患者已经授权。

授权范围为当前患者的日记、就诊摘要、已记录建议及历史反馈，并允许该医生填写建议和随访；不包括录音、联系方式、提醒设置、模拟医院传输队列。患者可以撤销，过期后也不能继续读取或保存。医生已经看过或自行保存的内容无法通过撤销追回。医生端每次请求重新检查权限；已打开页面会在下一次请求或约 30 秒的访问检查后清除失效患者视图。

### 3. 医生审阅

1. 选择已授权患者，查看日记及缺失情况、实际用药、方案版本和每条历史反馈。
2. 生成当前就诊摘要，或查看历史摘要比较。旧摘要保持原快照，不自动修改。
3. 在当前摘要上逐项确认“日记”“相关历史反馈”“摘要及来源时间”，完成审阅。
4. 填写医生评估、建议与方案记录、随访。草稿可先保存；确认时必须有当前有效审阅记录。患者日记、转录建议或反馈更新后，重新生成摘要并审阅。
5. 已确认评估或方案通过“修订”生成新版本，并说明原因；保留前版和关联反馈。再次生成摘要即可纳入新建议、修订及反馈。患者看到已确认内容，医生草稿不对患者或其他医生开放。

确认记录保存医生账号、时间、审阅记录 ID 和依据摘要 ID；历史摘要、方案版本、患者反馈保持关联。患者填写的方案和疗效观察始终标明患者来源，不会变成医生确认或实际用药事实。医生建议也不会自动新增患者的实际用药日记。

### 4. 使用边界和验证

患者连续离线日记保留；本版医生入口、授权和反馈提交需要连接服务。只有离线记录成功同步后医生才能看到它们。医生浏览内容仅保留在当前页面内存，不写入患者离线缓存；医生入口不提供离线登录。手机浏览器可以打开已部署的 HTTPS 地址，独立真实手机、弱网、跨设备、医患可用性及八种语言母语审核仍需真人验证。

部署到公网前还需运营者完成 HTTPS、身份审核、账号找回流程、备份恢复、访问日志与隐私评估。本版不宣称临床有效性或法规合规认证。历史v0.7.0附件保持不变；[0.8.2标签提交的远程CI](https://github.com/Alias1027/Multi-language-Headache-Diary--/actions/runs/40021043776)已通过，不能替代真实医师身份核验或临床测试。

## English

This workflow is included in the [0.8.2 research pre-release](https://github.com/Alias1027/Multi-language-Headache-Diary--/releases/tag/v0.8.2); physical-device and deployed-service use remain unverified. The patient headache diary remains the core product. The clinician workspace records reviews, advice and follow-up; it is not a full medical record or electronic prescribing system. Operator approval does not verify professional credentials; the operator must check identity and eligibility separately.

### Separate accounts and operator approval

Open `/clinician.html` on the same service (default local URL: `http://127.0.0.1:8765/clinician.html`). Request a clinician account using a separate email, a password of at least 12 characters and a display name. Patient credentials cannot sign in here; one email cannot serve both roles. Contact the operator for approval before signing in. Patient and clinician sessions use separate cookies and may coexist in different tabs.

From the project directory, the operator runs the `list` and `approve` commands shown above, replacing the example email. Choose the data directory belonging to that service. `suspend` disables an account and invalidates sessions. `reset-password` generates a new random password and invalidates sessions; deliver it privately, never through public logs or GitHub. These commands require server filesystem access; there is no public administration endpoint. Legacy simulated clinician records remain intact, but those accounts require explicit approval, a password reset and new patient permission before use.

### Patient permission

The clinician privately shares their connection code. In **Settings → Clinician access** (also reachable through **Manage access / Connect my clinician** on **Advice & follow-up**), the patient checks the displayed clinician identity, enters a recognizable label, chooses 7 / 30 / 90 days and explicitly accepts the scope. A connection code alone grants no patient access.

The grant covers that patient's diary, visit summaries, advice and feedback history, plus clinician advice/follow-up entries. Audio, contacts, reminders and mock hospital transfer queues are excluded. The patient may revoke permission; expiration also blocks subsequent access and writes. Revocation cannot retrieve material already viewed or independently saved. Permission is rechecked for every request; an open invalidated patient view clears on its next request or periodic access check (about 30 seconds).

### Review workflow

1. Select an authorized patient and inspect diary gaps, actual medication entries, plan versions and each relevant historical feedback entry.
2. Generate a current visit summary; historical summaries remain immutable snapshots for comparison.
3. Explicitly check diary, feedback and summary/source dates, then complete the review.
4. Save assessments, advice/plan records and follow-ups. Drafts may be saved first. Confirmation requires a valid review; patient diary, transcribed advice or feedback changes require regeneration and review.
5. Amend confirmed assessments/plans with a reason instead of overwriting them. Previous versions and their feedback remain linked. Regenerate the summary to include new advice and feedback. Drafts are private to their author.

Confirmed records retain clinician authorship, time, review ID and reviewed-summary ID. Patient-reported advice and responses remain distinct from clinician entries and actual medication use. Clinician advice never automatically creates a patient medication entry.

### Availability and validation limits

Consecutive offline patient diaries remain supported. Clinician sign-in, permission and care submissions require a service connection; clinicians see offline diary changes only after successful synchronization. Clinician patient data stays in page memory and is not stored in the patient's offline cache. An HTTPS deployment is needed for remote/mobile use. Independent physical-device, cross-device, weak-network, usability and native-speaker checks remain pending.

Public deployment still requires operational identity verification, HTTPS, account recovery, backup/restore, access-log and privacy review. No clinical effectiveness or regulatory certification is claimed. Historical v0.7.0 assets remain unchanged; [hosted CI for the 0.8.2 tagged commit](https://github.com/Alias1027/Multi-language-Headache-Diary--/actions/runs/40021043776) passed but does not verify clinician credentials or clinical use.

## 从旧版升级 / Updating an existing installation

先保存当前填写内容，再关闭同一地址的所有患者日记和PWA窗口，保持联网后重新打开。离线缓存的更新会等待旧页面退出，以防新旧模块混用；若首次仍显示旧版本，再关闭并打开一次。不要清除站点数据，待同步记录仍在原浏览器、原地址中。`localhost` 与 `127.0.0.1` 是不同的浏览器存储地址，不能通过换地址取回原离线记录。

Save current edits, close every diary tab and PWA window for the same address, then reopen while connected. The offline shell waits for older pages to exit before activation to avoid mixed versions; close and reopen once more if the first load still shows the old version. Do not clear site data: pending records remain in the original browser and origin. `localhost` and `127.0.0.1` have separate browser storage; switching addresses does not migrate offline records.

登录页分别显示患者与医生入口。患者登录后的建议页和授权设置不再重复放置医生登录按钮。

The sign-in page offers distinct patient and clinician portals. Clinician sign-in links are no longer repeated in the patient advice page or authorization settings.
