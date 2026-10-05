# CWrite Lite：AI API 与 Vercel 配置

核对日期：2026-10-05。这里列的是当前代码实际使用的服务；没有包含密钥值。

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

当前文字模型是 `deepseek-chat`，图片模型固定为下面两个 fal 模型。视频已指定为 **Doubao-Seedance-2.5 260628**，完整模型 ID 为 `doubao-seedance-2-5-260628`。动画计划现在会记录该模型及视频任务接口地址；Drama 已接入直接图生视频，按幕生成临时 MP4。数据库表需要运行项目的迁移命令 `npm run db:migrate`；环境变量填写完成并不等于数据库表已创建。

**图片继续使用原来的 fal.ai Nano Banana 2**：描述生成调用 `fal-ai/nano-banana-2`，画稿参考与地图编辑调用 `fal-ai/nano-banana-2/edit`，共用 `FAL_KEY`。Seedance 2.5 负责后续视频生成，图片服务保持上述配置。

### 视频配置（已选定服务）

```dotenv
ARK_VIDEO_MODEL=doubao-seedance-2-5-260628
ARK_API_KEY=填写火山方舟控制台的APIKey
```

`ARK_API_KEY` 与模型权限就能提交图生视频；无需对象存储或合并 worker。完成页一键生成所有场景的视频，默认每幕 5 秒；提供临时视频播放、下载。数据库新增 `spriteUrl`、`VideoJob` 和 `VideoClip` 后，需要运行 `npm run db:migrate`。构建成功不等于这些表已经在生产库里。

## 2. 当前所有 AI API 名称

### 外部服务

| 服务 / 模型 | 外部 API | 当前用途 |
| --- | --- | --- |
| DeepSeek / `deepseek-chat` | `POST https://api.deepseek.com/chat/completions` | 所有文字 AI 请求 |
| fal / `fal-ai/nano-banana-2` | fal SDK 的 `fal.subscribe("fal-ai/nano-banana-2", …)` | 从描述生成角色、物品和背景；输出 WebP |
| fal / `fal-ai/nano-banana-2/edit` | fal SDK 的 `fal.subscribe("fal-ai/nano-banana-2/edit", …)` | 根据学生画稿生成图片；地图使用裁剪的底图参考生成独立插画 |
| fal / `fal-ai/imageutils/rembg` | fal SDK 的 `fal.subscribe("fal-ai/imageutils/rembg", …)` | 角色和物品生成后的去背景。失败时保留原图，不把原图当作透明图。共用 `FAL_KEY` |
| 火山方舟 / `doubao-seedance-2-5-260628` | `POST /contents/generations/tasks`；`GET /contents/generations/tasks/{id}` | 根据画板合成首帧，自动编写提示词，一键为所有场景各提交 5 秒图生视频；无需 TOS 或 worker，返回临时 MP4 链接 |

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
| `POST /api/map-update` | 无 `kind`，传 `storyId` | 裁出原地图的小块作为风格参考，调用 `fal-ai/nano-banana-2/edit` 生成独立插画并固定在图钉上；保留底图，同一版本复用缓存。模型名和 fal 请求编号存在 `previewArt` |
| `POST /api/drama-video` | 无 `kind`，传 `storyId` | 传 `storyId`、`sceneId`，自动编写提示词并创建 5 秒 Seedance 任务；相同画板版本复用任务 |

其余 `/api/data`、角色库、登录等接口是保存或读取数据，不调用独立 AI 服务。Story / Drama 共用上述密钥和同一用户的角色库。

## 3. Drama 图生视频

完成页只需点击 Generate video，为每幕分别生成一个 5 秒视频，动画提示词由场景与人物话语自动编写。服务端合成画板背景与角色作为首帧，保留人物图片、大小、位置和翻转。使用无声、连续动画；不额外添加字幕。视频临时链接可播放与打开下载，无需长期保存。

任务号写入现有 VideoJob / VideoClip；刷新恢复状态，相同输入防重复提交。本地预览不调用付费视频 API。详细配置和恢复说明见 [VIDEO_DEPLOYMENT.md](VIDEO_DEPLOYMENT.md)。
