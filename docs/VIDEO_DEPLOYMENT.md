# 视频部署方案与验收

当前线上项目：https://vercel.com/muse-ai/c-write-lite 。已在管理页面确认有 ARK_API_KEY 和 ARK_VIDEO_MODEL，尚无 TOS 与 worker 配置。本次不创建收费资源、不修改生产数据。

## 采用的方案

Vercel 仅验证登录、保存任务与查询。长期运行的 Node 后台从 PostgreSQL 领取任务，合成每幕参考图、提交 Ark、查状态、生成完整英文字幕、用 FFmpeg 合并并转存到私有 TOS。关闭网页不影响后台。默认无配音，字幕使用学生原文。

后台 Dockerfile：`worker/Dockerfile`。推荐先用一台 Linux 容器服务器或已有支持 Docker 的托管服务，至少 2 CPU、2GB 内存与临时磁盘。需要能访问数据库、Ark、fal 素材及 TOS。没有账号和费用确认前，不开通新付费服务。

## 1. 私有 TOS 存储桶

在火山引擎创建私有存储桶，使用专门服务身份，仅授权这个桶需要的对象读写；不要开公共读。准备 Access Key ID / Secret、桶名、区域与 TOS endpoint。密钥只填服务端环境设置，不贴聊天、不放 NEXT_PUBLIC 变量。

对象以 `videos/{userId}/{jobId}/` 为前缀，分别保存参考图、带字幕的片段和 final.mp4。数据库保存 `tos://桶/对象`，每次登录查询时生成一小时访问链接，过期后重新打开页面即可恢复。桶需要保留学生成片；生命周期策略不要清理 final.mp4。

## 2. 环境变量分配

|变量|Vercel|后台|
|---|---|---|
|DATABASE_URL|已有，迁移时使用|同一生产数据库，或测试阶段使用独立测试数据库|
|ARK_API_KEY|保留已有值|同一视频服务 Key|
|ARK_VIDEO_MODEL|保留已有值|快照由任务决定，默认同已有配置|
|TOS_ACCESS_KEY_ID / TOS_SECRET_ACCESS_KEY|签名读取私有成片|上传和读取成片|
|TOS_BUCKET / TOS_REGION / TOS_ENDPOINT|与后台一致|实际存储桶设置|
|VIDEO_WORKER_URL|后台 HTTPS 根地址|不需要|
|VIDEO_WORKER_SECRET|至少32个随机字符|相同值，用于健康检查认证|
|APP_BASE_URL|https://c-write-lite.vercel.app|相同值，允许读取站内素材|
|VIDEO_MEDIA_HOSTS|不需要|可选，仅实际供应商素材 CDN 的明确域名，逗号分隔|
|PORT|不需要|容器监听端口，默认8080|

后台不需要 FAL_KEY 或 DEEPSEEK_API_KEY。网页角色与地图生成仍由原服务处理。

## 3. 部署后台

先在独立测试数据库执行 `npm run db:migrate`；生产上线前做数据库备份，再执行增量迁移。不要 reset、seed 或允许数据损失。新增迁移包括 sprite/video 表、VideoJob.leaseUntil 与 AssetGeneration。

Vercel 分支预览默认跳过数据库迁移，避免复用生产 DATABASE_URL 时改变生产表。需要验证分支预览时，先配置独立预览数据库，再仅在 Preview 环境设置 `CWRITE_MIGRATE_PREVIEW=true`。Production 保留现有部署迁移流程。

从项目目录构建：`docker build -f worker/Dockerfile -t cwrite-video-worker .`

运行容器时通过平台的 Secret/env 配置传入上述后台变量，绑定 HTTPS 入口，启用异常重启。后台轮询数据库，不依赖浏览器或 Vercel 未等待的 Promise。允许多个实例时数据库租约防止同时领取同一任务。

后台 `/health` 需要 `Authorization: Bearer VIDEO_WORKER_SECRET`。初始化检查 FFmpeg 和配置；接入后应验证数据库轮询与 TOS 读写。Vercel 创建任务之前检查健康状态，后台离线时不创建付费任务。

将后台 URL 和变量填入 Vercel，重新部署经过验证的代码。当前本地目录不是 Git checkout，不能直接推送或覆盖远程仓库；先从实际 main 建立 checkout 并比较合并本次改动。

## 4. 重试与费用

同一作品版本使用唯一 job，片段任务号持久保存。后台恢复时复用已提交任务、已转存片段；渲染失败可用已有视频重做，不重生成已成功片段。

若提交超时或进程在保存任务号前退出，状态为 needs_confirmation。先检查 Ark 后台任务历史，确定是否已扣费。界面明确提示付费重试边界，不自动无限重提。发生这类情况的旧片段需要人工确认后点击 Retry。不要直接清空数据库任务号。

地图/透明图付费前有 AssetGeneration 唯一领取记录。若进程在调用中退出，记录会停在 processing；需核对供应商结果后由维护者恢复，不自动超时后盲目付费重做。

## 5. 真正上线前的验收

- 两幕、不同背景和人物站位；每句 Says/Thinks 在字幕出现且不跨幕、不改写。
- 并发点击仅一个 job，刷新、关闭网页和重启后台可恢复。
- Ark 超时进入待确认；明确失败只重试该片段；已成功片段复用。
- 最终 MP4 可播放与下载；私有桶对象长期存在，授权链接过期后重新查询可播放。
- 第二学生不能查询第一学生 job，跨用户404。
- 每次真实验证记录 job ID、供应商 task ID 与付费提交次数，不记录 Key。

本地 mock 与 FFmpeg 合成成功不代表 Ark/TOS 已真实接通。需要资源开通与配置后再做一次真实两幕验收。
