# Drama 图生视频

当前使用简化方案：读取已保存的 Drama 画板，将每幕背景与人物合成首帧，调用火山方舟 Seedance 图生视频。提示词根据场景、舞台说明和 Says / Thinks 自动编写；不在界面显示。一键为所有场景各生成 5 秒无声动画，可播放和打开下载。视频使用供应商临时链接，不作为永久作品存储。

## 配置

已有的 PostgreSQL、`ARK_API_KEY` 与 `ARK_VIDEO_MODEL=doubao-seedance-2-5-260628` 即可。用户需有该视频模型的访问权限。不需要 TOS、FFmpeg、独立服务器或 `VIDEO_WORKER_URL`。`APP_BASE_URL` 使用站点正式地址，用于允许读取本站素材。

数据库继续使用现有 VideoJob / VideoClip 表，保存任务号与临时链接；沿用现有部署迁移，没有新增字段。视频模型运行在 Ark 后台，Vercel 只合成首帧、提交任务和查询状态，不在一次请求中等完整视频。

## 使用和恢复

在 Drama 完成页点击 Generate video，有几幕就生成几个视频，每幕默认 5 秒。保留画板中的人物图片、位置、大小和翻转作为首帧；对话意图转为动作提示，不保证视频完整演完所有台词，也不生成英文字幕。

同一画板版本、同一幕、相同提示词和时长复用任务。并发点击不会重复提交。网页重新打开可恢复任务；生成完成后及时下载。修改画板或场景内容后会创建新任务。明确失败可重试；提交结果不明时先核对 Ark 任务历史，不能自动再次扣费。

本地预览不提交付费任务。测试覆盖首帧合成、请求参数、任务防重、结果查询和归属检查；模拟通过不代表真实付费视频已经生成。

旧 worker/ 与 TOS 文件保留为可选历史实现，当前网页接口不会使用它们。

官方接口：[提交视频](https://docs.volcengine.com/docs/ark/create-video-generation-task-api?lang=zh)、[Seedance 2.5](https://docs.volcengine.com/docs/ark/seedance-2-5)。
