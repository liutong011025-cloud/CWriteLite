# CWrite Lite：AI API 与 Vercel 配置

核对日期：2026-10-04。这里列的是当前代码实际使用的服务；没有包含密钥值。

## 1. 当前部署需要填写的环境变量

在 Vercel 项目 Settings → Environment Variables 填写，并选中需要的 Production / Preview 环境，然后重新部署。

| 变量名 | 填什么 | 用途 |
| --- | --- | --- |
| `DEEPSEEK_API_KEY` | DeepSeek 的 API Key | 网站全部文字 AI：建议、Cagent、写作检查、价值观分析、Drama 动画分镜排序 |
| `FAL_KEY` | fal.ai 的 API Key | 角色、物品、背景生成，以及完成作品后更新地图 |
| `DATABASE_URL` | 可从 Vercel 访问的 PostgreSQL 连接串 | 账号、角色库、作品、研究事件及 AI 分镜记录；本地数据库地址不能直接用于云端 |
| `APP_BASE_URL` | 正式站点完整地址，例如 `https://your-site.vercel.app` | 将网站内的背景图地址转为图片服务可以读取的公网地址 |
| `CWRITE_LOCAL_MOCK_IMAGES` | `false`，也可以不设置 | 本地预览图片的开关；生产环境不会执行图片模拟分支 |

`NEXT_PUBLIC_APP_URL` 是 `APP_BASE_URL` 的备用地址。`DEEPSEEK_KEY` 是旧的密钥备用变量，推荐只填 `DEEPSEEK_API_KEY`。密钥不要使用 `NEXT_PUBLIC_` 前缀。

当前文字模型是 `deepseek-chat`，图片模型固定为下面两个 fal 模型。视频已指定为 **Doubao-Seedance-2.5 260628**，完整模型 ID 为 `doubao-seedance-2-5-260628`。动画计划现在会记录该模型及视频任务接口地址；正式视频提交留到部署阶段接入。数据库表需要运行项目的迁移命令 `npm run db:migrate`；环境变量填写完成并不等于数据库表已创建。

**图片继续使用原来的 fal.ai Nano Banana 2**：描述生成调用 `fal-ai/nano-banana-2`，画稿参考与地图编辑调用 `fal-ai/nano-banana-2/edit`，共用 `FAL_KEY`。Seedance 2.5 负责后续视频生成，图片服务保持上述配置。

### 视频配置（已选定服务）

```dotenv
ARK_VIDEO_MODEL=doubao-seedance-2-5-260628
ARK_API_KEY=填写火山方舟控制台的APIKey
```

`ARK_VIDEO_MODEL` 已由动画分镜接口读取，写入下载的动画计划。未填写时默认使用上面的指定版本。`ARK_API_KEY` 是后续视频提交的预留密钥，目前网页分镜预览不使用它，也不产生 Seedance 视频生成费用。

## 2. 当前所有 AI API 名称

### 外部服务

| 服务 / 模型 | 外部 API | 当前用途 |
| --- | --- | --- |
| DeepSeek / `deepseek-chat` | `POST https://api.deepseek.com/chat/completions` | 所有文字 AI 请求 |
| fal / `fal-ai/nano-banana-2` | fal SDK 的 `fal.subscribe("fal-ai/nano-banana-2", …)` | 从描述生成角色、物品和背景；输出 WebP，通常 1K |
| fal / `fal-ai/nano-banana-2/edit` | fal SDK 的 `fal.subscribe("fal-ai/nano-banana-2/edit", …)` | 根据学生画稿生成图片、在原地图上迭代写作元素 |
| 火山方舟 / `doubao-seedance-2-5-260628` | `POST https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks`；查询 `GET …/tasks/{id}` | 已选定的 Drama 视频服务；当前仅记录目标配置，尚未提交真实视频任务 |

### 网站内部接口

| 内部地址 | 请求名称 `kind` | 功能 / 服务 |
| --- | --- | --- |
| `POST /api/ai` | `chat` | 与 Cagent 自由对话 / DeepSeek |
| `POST /api/ai` | `coach` | 随当前写作和画板更新的 Cagent 提示 / DeepSeek |
| `POST /api/ai` | `tips` | Story 词汇与句式建议 / DeepSeek |
| `POST /api/ai` | `characterTips` | 创建角色的词汇建议 / DeepSeek |
| `POST /api/ai` | `canvas` | Story Canvas 连线建议 / DeepSeek |
| `POST /api/ai` | `canvasReview` | Story 开始写作前的可跳过画板检查 / DeepSeek |
| `POST /api/ai` | `dramaTips` | 根据当前角色及 Says / Thinks 提供句式建议 / DeepSeek |
| `POST /api/ai` | `dramaReview` | Drama 完成前的可跳过连贯性检查 / DeepSeek |
| `POST /api/ai` | `dramaVideoPlan` | 理解已有台词，安排动画呈现顺序 / DeepSeek；**不生成视频** |
| `POST /api/ai` | `feedback` | 作品回顾与修改建议 / DeepSeek |
| `POST /api/ai` | `growth` | 从已完成作品中找价值观证据并更新树苗 / DeepSeek |
| `POST /api/ai` | `image` | 生成角色、物品或背景 / fal |
| `POST /api/section-gate` | 无 `kind`，传 `storyId` 与 `section` | Story 五部分检查：角色、画板联系、当前结构和新情节 / DeepSeek + 服务端证据核对 |
| `POST /api/dify-cagent-guide` | 无 `kind`，传 `userMessage` | My Farm 小熊指导 / **实际调用 DeepSeek，名字保留了旧 Dify 命名**；不需要 Dify 密钥 |
| `POST /api/map-update` | 无 `kind` | 完成 Story / Drama 后更新写作地图 / fal 图片编辑 |

其余 `/api/data`、角色库、登录等接口是保存或读取数据，不调用独立 AI 服务。Story / Drama 共用上述密钥和同一用户的角色库。

## 3. Drama 如何复现为动画

当前已实现 `Preview animation`，它是网页分镜预览，没有生成 MP4：

1. 读取学生已保存的每一幕背景；先展示背景。
2. 读取角色卡图片、位置、大小和翻转状态；展示原有角色。
3. DeepSeek 根据现有话语的含义，把“发起话语、回应、思考”安排为合理顺序。
4. 服务端核对每一幕的行 ID：每句必须出现一次，不能跨幕、漏句、重复或增加角色。非法排序回退为现有顺序。
5. 分镜按顺序突出角色，显示其原话；Thinks 使用思考气泡，不当成可听见的台词。
6. 学生可播放、暂停、选择时刻和下载完整动画计划 JSON。原始画板保持同时展示，不被分镜排序改写。

JSON 包含背景、全部角色图片和布局、原始台词、每个镜头的时间与动作提示，以及 `videoTarget`：服务商、指定视频模型和任务提交/查询地址。对应 AI 响应也记录在该用户的研究事件里。`generatedVideo:false` 与 `videoTarget.status:"planned"` 明确表示这是预览计划。

## 4. 部署后接 Seedance 2.5 视频：待接入的明确边界

**当前没有真实视频提交 / 查询接口，也没有视频文件导出。只填写 `ARK_API_KEY` 不会开启视频。** 这是按“本地先不真正生成、部署时再接”的要求保留的后续工作。接入目标已经确定为火山方舟的 `doubao-seedance-2-5-260628`，不再保留两种待选认证方案。

正式视频接入应使用上面的动画计划，按幕或短镜头生成，再合并完整剧本。先将背景与角色合成为参考画面，避免视频模型重新画角色；字幕使用原始台词叠加，避免模型把英文写错。思考只作为画面与字幕呈现，是否加入旁白之后单独决定。最终文件需要持久化存储，不能依赖 Vercel 函数的临时文件。

接口地址：

- 基础地址：`https://ark.cn-beijing.volces.com/api/v3`
- 提交视频：`POST /contents/generations/tasks`
- 查询结果：`GET /contents/generations/tasks/{id}`
- 认证：`Authorization: Bearer <ARK_API_KEY>`
- 模型：`doubao-seedance-2-5-260628`

你提供的快速调用示例中的 `doubao-seed-2-1-pro-260628` 和 `/responses` 属于文字模型示例，不用于 Drama 视频。视频适配器应按上面的视频任务接口接入。现有 DeepSeek 文字建议和 fal 图片生成不受这次视频模型选择影响。

已核对的官方资料：[Seedance 2.5 模型与示例](https://docs.volcengine.com/docs/ark/seedance-2-5)、[方舟视频生成任务](https://docs.volcengine.com/docs/ark/create-video-generation-task-api?lang=zh)、[方舟任务查询](https://api.volcengine.com/api-docs/view?action=GetContentsGenerationsTask&serviceCode=ark&version=2024-01-01)。

接入时还需补：任务归属验证、异步任务状态持久化、失败重试与费用防重、视频存储、整段合并。不要在一次 Vercel 请求里等待全部视频生成结束。
