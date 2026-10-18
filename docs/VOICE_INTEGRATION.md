# Voice-assisted entry — 0.6.1

## 控件说明

开始和停止录音共用一个随状态切换的按钮；有输入或已打开笔记时显示次要按钮“另起一条（当前内容不带入）”。后者只新建编辑上下文，保留既有已保存笔记；未保存内容仍须确认后离开。录音、保存、整理及确认填表保持独立步骤。

## 当前可用功能

「我的日记」右下按钮打开的语音浮窗支持中文／英文工作流：麦克风录音或上传 WebM、Ogg、WAV、MP3、M4A 原件 → 保存 → 可选识别 → 校正文稿 → 查看候选字段及原文依据 → 确认后填表 → 手动确认日期／时间后保存。

**交付包没有内置语音模型，默认不会自动把声音转换成文字。** 可选云端及本机模型接口见[模型接入说明](MODEL_INTEGRATION.md)。没有模型也能录音、保留原件、播放、下载、删除，并对手动输入／粘贴的中文英文文字进行规则整理。模型未配置时识别按钮不可用，页面明确提示。语音控件说明已覆盖八种界面语言；可处理的语音和文字输入仍限中文、英文。

录音最长 300 秒；音频每份 ≤10 MiB；每账号最多100份音频／文字笔记、音频总计 ≤100 MiB。上传文件限制为字节数，不推断文件时长。浏览器须允许麦克风，并支持 MediaRecorder；格式由浏览器选择。本机 localhost/127.0.0.1 是当前运行方式；手机和三个小程序容器内的录音尚未验证。

## 自动整理的范围

内置 `public/voice-parser.mjs` 是确定性规则解析器，**不是医学大模型或通用自然语言理解模型**。

- 支持常见部位、性质、0–10数字疼痛评分、明确数值时长、自述每周／每月频率、部分伴随症状、怀疑诱因。
- 支持少量中英文通用药名及明确数字剂量；未识别的药名、多个药物／剂量、中文数字和复杂叙述应人工填写。
- 用药响应保留为叙述，不自动生成“2小时无痛”、功能恢复或疗效结论。
- 自述持续时间单独保存，不根据它虚构结束时间，不进入已完成发作时长统计。自述频率也不替代日记观察频率。
- 日期、起止时间、服药时间均要求在表单内手动填写。未提及、否定、不确定不是正常值；有限规则仍会漏提取或误提取。
- 每次只处理一个发作／用药事件。完整原文在语音笔记保留；填表备注最多复制前2000字符，并保存 `sourceVoiceId` / `sourceVoiceRevision` 关联。
- 提交之前可调整所有候选字段。语音页面保存及识别本身不会改变正式日记、统计或医院报告。

例子：`今天头痛，左侧太阳穴跳痛，疼痛6分，持续了2小时，恶心，没有呕吐，可能熬夜导致，服用了布洛芬200毫克，2小时后仍有疼痛。`

English: `I have a headache, left temple, throbbing, pain 6/10. It lasted 2 hours, nausea, no vomiting, possibly poor sleep. I took ibuprofen 200 mg. 2 hours later still pain.`

## 原始文件、隐私与恢复

- 保存收到的音频原字节及SHA-256，不转码。浏览器录音的“原件”是 MediaRecorder 生成的容器，不是未经编码的麦克风PCM。
- 音频、原始识别文字、校正文字和元数据作为独立 AES-256-GCM 密文存入 `data/diary.sqlite` 的 `voice_notes` 表，绑定账号和记录ID；解密播放／下载均须登录。
- 首次模型识别文字及模型名保留不改，最近模型结果与可编辑文字另存。校正文字保留最新版本并递增修订号；**不是完整的逐字编辑历史档案**。
- 浏览器录音停止／文件选择后，会尝试加密暂存单份草稿；暂存失败有提示。录音进行中、关闭前未落盘的内容或浏览器清理数据可能丢失。原始音频保存到本机服务后再退出最可靠。
- 不使用浏览器 `SpeechRecognition` 服务，不默认把音频发送第三方。HD_ASR_URL仅允许本机HTTP回环地址；0.4.4另提供显式开启的服务端云模型适配器，外部音频/文字处理须逐次确认目的服务。转发云端的本机适配器须标注HD_ASR_EXTERNAL与HD_ASR_LABEL。
- 语音原件与完整转录笔记不进入医院共享包／常规JSON日记导出；**经您确认存入表单的字段和备注仍按原日记共享授权处理**。音频可逐份下载；尚无语音批量导出。
- 删除语音笔记为逻辑删除，不删除已确认的日记条目；数据库空闲页、备份或浏览器历史副本不保证物理擦除。备份停止后的整个 `data`，包含数据库及密钥。
- 本机密钥与数据库同机，管理员／系统被入侵不在此实验版防护范围。下载后的音频是未加密文件，勿提交到公开仓库。

## 可替换 ASR HTTP 接口

启动应用前设置环境变量 `HD_ASR_URL=http://127.0.0.1:8766/transcribe`。`.env.example` 是说明文件，不会自动加载。`Start.ps1` 启动时继承当前终端环境；重启后设置才生效。

应用向该固定端点 POST `multipart/form-data`：

| 字段 | 类型 | 内容 |
|---|---|---|
| `file` | 原始音频二进制 | 生成的ID文件名和原音频MIME |
| `language` | 文本 | `zh` 或 `en` |

HTTP200响应：

```json
{"text":"I have left temple pain.","language":"en","model":"your-model-version"}
```

`text` 非空且 ≤5000字符；`language` 必须等于请求；`model` 是 ≤120字符的版本标识。最大响应64KiB，超时90秒，不跟随重定向。失败保留原始音频，不伪造转录。识别过程中发生编辑或删除，旧识别结果被修订检查拒绝。

可接入 faster-whisper、whisper.cpp、其他中英文模型或自建语音服务，但需实现上面的接口。`examples/asr-local/adapter.py` 提供可供验证的本机 faster-whisper CPU 适配器示例。**示例未在本次交付中安装模型或完成真实语音准确率验证**。

### 可选 faster-whisper 示例（自行准备模型后启用）

把 Python 环境、模型和缓存放到源码目录之外的工作目录，避免提交到仓库或复制进发布包。需要 Python 3.10+；选择多语言模型，不能使用仅英文的 .en 模型来支持中文。模型文件须预先下载并检查其许可证。下面是从源码根目录（包含 package.json 的目录）执行的 Windows PowerShell 示例；工作目录默认为相邻的 headache-local，可改到容量足够的位置。

```powershell
# 先进入源码根目录；这些步骤不是默认演示所必需的。
$diarySource = (Get-Location).Path
$diaryAsrWork = Join-Path (Split-Path $diarySource -Parent) 'headache-local'
$diaryAsrEnv = Join-Path $diaryAsrWork 'asr-venv'
$diaryAsrModel = Join-Path $diaryAsrWork 'models/whisper-multilingual'
python -m venv $diaryAsrEnv
$diaryAsrPython = Join-Path $diaryAsrEnv 'Scripts/python.exe'
& $diaryAsrPython -m pip install --no-cache-dir -r (Join-Path $diarySource 'examples/asr-local/requirements.txt')
# 先把已获许可的多语言模型放到 $diaryAsrModel，再执行下一行。
& $diaryAsrPython (Join-Path $diarySource 'examples/asr-local/adapter.py') --model-dir $diaryAsrModel
```

另开终端，同样进入源码根目录，停止旧日记服务后：

```powershell
$env:HD_ASR_URL='http://127.0.0.1:8766/transcribe'
node server/main.mjs
```

若使用单独的 Windows 便携包，请在该包根目录配置同样的环境变量，然后执行 `./Start.ps1 -NoBrowser`。便携启动器不属于 GitHub 源码的一部分；不要把个人机器的绝对路径写入公开文档。

模型从指定本地目录加载，示例代码不下载权重，不把音频写入临时文件。CPU延迟可能超过当前90秒限制；先用短录音验证。需要生产级并发、身份认证、日志和超时治理时，应替换此演示适配器。

## 应用内部 API

所有接口要求原有账号会话；POST须含 `X-CSRF-Token`，并检查Host/Origin。上传之前鉴权，限制请求体大小。

| Endpoint | Contract |
|---|---|
| GET `/api/voice/config` | 模型是否配置、语言、限额；不返回端点凭据 |
| GET `/api/voice/notes` | 当前账号笔记列表，无音频二进制 |
| POST `/api/voice/upload?id=...&language=zh` | 原始二进制请求体，音频Content-Type；ID重试幂等，相同ID不同文件拒绝 |
| POST `/api/voice/note` | `{id,revision,language,text}`；新文字笔记revision=0 |
| POST `/api/voice/transcribe` | `{id,revision}`；成功返回新版note |
| GET `/api/voice/audio?id=...` | 登录后原字节播放；加 `&download=1` 下载 |
| POST `/api/voice/delete` | `{id,revision}`；仅删除本账号对应笔记 |

0.4.4已提供/api/voice/extract及严格候选校验，详见MODEL_INTEGRATION.md。自定义结构化适配器可实现与 `extractVoice` 相同的 `fields/evidence/warnings/unclassifiedText` 输出，给出可核对的原文依据，仍经过用户确认及服务端原有校验。不得绕过表单直接写诊断或自动填入未提及值。

参考：[MediaRecorder](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)、[getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)、[faster-whisper 官方仓库](https://github.com/SYSTRAN/faster-whisper)。这些是技术依据，不代表医学有效性验证。

## 0.6.0 review-only integration

Speech models and Python ASR dependencies are optional, unbundled and not enabled in this delivery. Only adapters/contracts are retained; typed ASR text works without a model. Candidate selection is per field plus explicit review. A conservative bilingual guard withholds medication candidates when advice, planned or historical use is detected, including provider output; mixed statements may therefore need manual entry. This is not a semantic-accuracy guarantee. No automatic medical record or prescription writeback is supported. See [patient workflow](PATIENT_WORKFLOW.md).
