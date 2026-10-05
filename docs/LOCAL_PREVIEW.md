# 当前本地预览版

访问 http://127.0.0.1:3010 ，账号 `Tony`，密码 `123321`。

本版启用 `CWRITE_LOCAL_PREVIEW=true` 和 `CWRITE_LOCAL_MOCK_IMAGES=true`，且仅在开发模式生效。图片使用本地素材/学生画稿，Cagent 给演示建议，所有预览请求不调用 DeepSeek、fal 或 Ark。地图使用本地图层，成长不做真实 AI 奖励。视频可看动画预览，不能付费生成。

已准备完整 Story「Preview · Fox and the lost bag」和两幕 Drama「Preview · Two friends help」。登录后进入农场，再进入 My Writing Board 阅读，也可以在地图开始新作品。正文结构审批没有伪造通过；新作品正文可保存，但正式审批需以后接通文字 AI。

## 重启

在项目目录运行 `npm run local`。启动器使用 Node，无需启用 PowerShell 脚本。需要 Windows、Node.js 和 PostgreSQL 17（默认安装目录 `C:\Program Files\PostgreSQL\17\bin`，不同目录可用 CWRITE_POSTGRES_BIN 指定）。首次下载依赖可能需要联网，运行预览时不调用付费 AI。

脚本使用本机独立数据库，端口54348、仅监听127.0.0.1，数据在 `.tool-cache/video-test-db`。它不会重置现有数据，也不会连接线上学生数据库。关闭终端停止网页；重新运行恢复本地作品。不要删除数据库目录，除非明确要清空本地预览作品。

## 未来连接 AI

打开 http://127.0.0.1:3010/local-setup 填入自己保存的 Key，密钥仅写入被忽略的 `.env.local`。Vercel 的 write-only Secret 不能读回原值。接通真实 AI 前在 `.env.local` 设置 `CWRITE_LOCAL_PREVIEW=false` 和 `CWRITE_LOCAL_MOCK_IMAGES=false`，再用 `npm run dev -- -H 127.0.0.1`，不要用会强制预览模式的 `npm run local`。

真实视频部署见 `docs/VIDEO_DEPLOYMENT.md`。源代码压缩包不包含密钥、本地数据库、依赖或测试生成的视频。
