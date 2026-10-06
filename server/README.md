# AI 音乐服务

前端仍部署在 GitHub Pages。本服务独立运行于支持 Node.js 22+ 的服务器，使用 fal 上的 Stable Audio 2.5 生成纯音乐。没有凭证时不会调用模型。

## 配置与启动

1. 在服务器将 `.env.example` 复制为 `.env`，设置 `FAL_KEY` 和至少 16 字符的随机 `MUSIC_ACCESS_CODE`。不要把它们写入前端或提交到仓库。
2. 启动：`node --env-file=server/.env server/music-server.mjs`（仓库根目录运行）。
3. 使用反向代理为该服务提供 HTTPS；将 `config.js` 的 `musicApiBase` 设置为服务公开 HTTPS origin，再推送网站。
4. 仅将创作邀请码提供给获准使用的访客。它是小范围体验的共享访问凭据，不是完整账户系统。

允许的浏览器 origin 默认为 `https://czx1220.github.io`，没有子路径。开发时可设为 `http://localhost:8000`。`GET /health` 返回服务是否配置，不返回秘密。邀请码只在页面内存中使用，不存入 localStorage。

## 实现与边界

- `POST /api/music`：传入 prompt 和 duration（8/16/24），返回本服务任务 id。
- `GET /api/music/:id`：查询排队状态或生成结果。前端每 3 秒查询，最多约 5 分钟；异常后保留本页任务 id 可继续查询。
- 服务端仅调用固定 fal 模型，密钥不发送到浏览器；API 有邀请码校验、来源限制、输入长度限制、请求超时、全局每小时 10 次和最多 2 个并发任务。
- 任务及限额在进程内存中，30 分钟过期，重启会清空；当前适合单实例小范围试用。公开规模化服务应迁移至持久化任务队列、账户鉴权与持久化配额。
- 模型调用可能产生费用；部署和配置付费账户由站点管理员完成。请求失败或网络超时仍可能已在提供商提交，避免立即重复生成。
- 生成结果由提供商托管，请及时下载；资源库投稿应使用已保存的稳定链接。
- 已通过模拟提供商的接口测试，尚无真实密钥，未进行真实生成验收。

模型接口依据：[fal 官方 Stable Audio 2.5 文档](https://fal.ai/models/fal-ai/stable-audio-25/text-to-audio/api)。
