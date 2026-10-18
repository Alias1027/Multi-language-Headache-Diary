# 模型接入说明 · 0.7.0

2026-10-13。交付的是可配置的数据接口及离线协议测试，不是已经开通的云模型服务。默认不开启、不读取前端密钥、不调用外部模型。项目中的“ChatGPT接入”对应OpenAI开发者API，不使用聊天网页的登录会话。

## 两阶段接口与已实现范围

| 服务 | 音频→文字 | 文字→字段候选 |
|---|---|---|
| OpenAI API | 已实现文件转写请求适配 | 已实现Chat Completions JSON请求适配 |
| DeepSeek API | 本版不把聊天端点作为ASR；搭配另一个转写器 | 已实现兼容JSON请求适配 |
| 豆包／火山引擎 | 保留本机ASR适配器协议；专用WebSocket语音桥接需另行实现 | 已实现火山方舟Chat Completions请求适配 |
| 千问／DashScope | 已实现Qwen ASR音频data URI请求适配 | 已实现兼容JSON请求适配 |

以上“已实现”指请求组装、输出解析和模拟响应测试通过。账户区域、具体模型、格式、计费与供应商实时服务均须联调；模型标识由部署者填写，不锁定为永远有效的默认名称。供应商聊天模型并不自动具有音频转写能力。

## 配置

服务端实现为server/ai-providers.mjs；配置示例位于项目根目录.env.example。该文件只是说明，不会自动加载。可在启动服务前设置环境变量，或用Node的--env-file加载保存在私有目录的配置。不要把含密钥配置提交GitHub；.gitignore已排除.env及.env.*（除示例）。

| 环境变量 | 作用 |
|---|---|
| HD_ENABLE_CLOUD_AI | 只有1才启用云模型 |
| HD_CLOUD_ASR_PROVIDER | openai / qwen；不设置则关闭云转写 |
| HD_CLOUD_ASR_MODEL | 所选语音模型的实际标识 |
| HD_LLM_PROVIDER | openai / deepseek / doubao / qwen；不设置则关闭模型整理 |
| HD_LLM_MODEL | 所选文字模型标识，需支持Chat Completions及JSON输出 |
| OPENAI_API_KEY / DEEPSEEK_API_KEY / ARK_API_KEY / DASHSCOPE_API_KEY | 对应供应商服务端密钥 |
| HD_QWEN_REGION | cn（默认）、intl、us；与密钥所在区域匹配 |
| HD_ASR_URL | 保留的本机HTTP转写器地址，仅回环地址 |
| HD_ASR_TOKEN | 可选本机适配器Bearer密钥，仅在服务器之间使用 |
| HD_ASR_EXTERNAL | 本机适配器若会转发云端，必须设1 |
| HD_ASR_LABEL | 本机转发器的真实服务名称及区域，用于发送前提示 |

示例（仅示意，不含凭据；先停止原服务，配置后在同一终端启动）：

    $env:HD_ENABLE_CLOUD_AI='1'
    $env:HD_CLOUD_ASR_PROVIDER='openai'
    $env:HD_CLOUD_ASR_MODEL='填入账户可用的转写模型标识'
    $env:HD_LLM_PROVIDER='deepseek'
    $env:HD_LLM_MODEL='填入账户可用的JSON输出模型标识'
    # 从私有配置注入OPENAI_API_KEY与DEEPSEEK_API_KEY，不要写进公开脚本。
    # 从包含 package.json 的源码根目录启动。
    node server/main.mjs

若使用单独的 Windows 便携包，请从该包根目录运行 `./Start.ps1 -NoBrowser`，并在同一终端先配置环境变量；不要依赖开发者机器的目录结构。

未配置的阶段仍保持可用降级：可以手动输入文字、用本机规则整理，并保留原件。语音和文字阶段可选不同平台。关闭云模型后重启即停止后续外发，不能撤回供应商已经接收的数据。

## 应用API

所有接口沿用登录、账号隔离、Origin与CSRF检查。

- GET /api/voice/config：返回两个阶段的可用状态、显示名称、模型、目的主机及consentId，不返回密钥。
- POST /api/voice/transcribe：{id, revision, consentProvider}。只发送当前已保存音频及语言；外部供应商必须匹配当前consentId。保留首次转写，失败不删除原音频。
- POST /api/voice/extract：{id, revision, consentProvider}。只发送当前笔记文字、语言和提取规则，不发送整份病历、邮箱、医院报告或音频。
- 整理成功返回{suggestions, note}；note修订号递增，保存最近一次候选、供应商/模型/接口版本、来源文字SHA-256和生成时间。文字编辑或重新识别后清除旧候选。不是无限版本审计档案。

候选协议headache-candidates-1要求JSON对象：

    {"contract":"headache-candidates-1","language":"en","items":[
      {"kind":"episodes","field":"quality","value":"pulsating","quote":"throbbing"}
    ]}

items最多48项；kind仅days/episodes/medications；字段、枚举、数值范围、字符串长度和每项原文引用均由服务端校验。数组字段逐值输出。任意日期、起止时间、诊断、处方与自动疗效结论不在允许字段中。冲突标量、额外字段、截断JSON或不存在的原文依据会被拒绝。

原文引用只能证明模型引用了输入，不能证明其理解正确。否定、他人症状、多次事件和药名剂量仍可能错误；提示词要求跳过不确定项目，最终仍需患者核对。模型输出不直接进入正式日记；填写后的正常临床字段校验继续执行。

外部请求逐次勾选确认，修改文字会清除此确认。每个账号的同一处理阶段仅允许一个正在执行的模型请求，90秒超时、不跟随重定向、不自动重试；响应上限64KiB。UI中配置名称不是连接成功或准确率证明。配置可见时，侧栏会提示已配置外部模型。

## 扩展豆包语音或其他协议

实现VOICE_INTEGRATION.md中的回环POST multipart协议：接收file/language，返回{text,language,model}；内部使用供应商专用语音协议。配置HD_ASR_EXTERNAL=1并用HD_ASR_LABEL明示真实接收方。本版没有声称实现豆包二进制WebSocket分包、音频转码或流式逐字识别。不要将方舟文字端点错误复用为音频上传端点。

## 验证下一步

历史0.6.0的122项自动测试曾包含假HTTP响应和本机模拟模型接口测试；该数字不是当前0.7.0的测试结果。本版工程证据见[验收记录](VALIDATION.md)，未因此完成真实云调用、费用或密钥配置。真实麦克风、医疗词汇、中英混说、口音、背景噪声及供应商可用性仍需验证。先使用获得许可的非患者样例，分别记录转写字/词错误、药名/剂量/否定/左右侧字段错误、人工纠正次数、耗时与成本，再决定是否进入患者试点。不能用接口成功率替代临床准确率。

在可选HTTPS部署中，“本机ASR适配器”指日记服务主机上的回环服务，不是患者手机。患者点击保存的音频与笔记会传到所连接的日记服务并在该服务端加密保存；外部模型处理另需配置及逐次确认。浏览器草稿和服务端原件是不同存储位置，不能宣称音频永不离开手机。

## 官方协议依据（2026-10-12核对）

- [OpenAI文件转写](https://developers.openai.com/api/docs/guides/speech-to-text)：音频文件转写端点与输入形式。
- [DeepSeek JSON输出](https://api-docs.deepseek.com/guides/json_mode/)：JSON输出请求参数。
- [火山方舟对话API](https://www.volcengine.com/docs/82379/1494384?lang=zh)：文字对话协议。
- [豆包流式语音识别](https://docs.volcengine.com/docs/DoubaoVoice/LargemodelstreamingautomaticspeechrecognitionAPI?lang=zh)：独立WebSocket语音协议。
- [Qwen ASR接口](https://help.aliyun.com/en/model-studio/qwen-asr-api-reference)：音频data URI及语言选项。

模型列表和账户权限会变化，以接入时控制台与官方文档为准。

## Review-only integration introduced in 0.6.0

Speech models and Python ASR dependencies are optional, unbundled and not enabled in this delivery. Only adapters/contracts are retained; typed ASR text works without a model. Candidate selection is per field plus explicit review. A conservative bilingual guard withholds medication candidates when advice, planned or historical use is detected, including provider output; mixed statements may therefore need manual entry. This is not a semantic-accuracy guarantee. No automatic medical record or prescription writeback is supported. See [patient workflow](PATIENT_WORKFLOW.md).
