# 客韵网站 Demo

更新：2026-10-06。

## 位置与设计

- 仓库：czx1220/hakka-culture；站点：https://czx1220.github.io/hakka-culture/ 。
- index.html：六个展示板块和详情弹窗。
- style.css：米白、朱红、青绿的视觉方案，桌面与移动端布局。
- app.js：音乐筛选搜索、合成试听、WAV 生成下载、弹窗、本机灵感存储。
- assets/landscape.svg：项目原创山水土楼示意插画。
- .github/workflows/pages.yml：main 推送后发布 GitHub Pages，仅上传页面和 assets。
- README.md：运行方法与 demo 能力边界。
- 根目录三张微信图片为用户参考素材，已忽略，不提交到公开仓库。

## 状态

- 已创建公开仓库，首次 Pages Actions 部署成功，站点 HTTP 200。
- JavaScript 语法检查通过；DOM 环境检查通过：音乐分类/搜索/空结果、生成音频、WAV 字节长度、本机灵感存储、弹窗关闭、导航锚点。
- 浏览器自动化通道不可用，尚未实际浏览器视觉验收。CSS 已实现窄屏布局，需后续实际设备确认。
- 字体可从 Google Fonts 加载；不可达时使用系统字体。

## 能力与下一步

当前是静态概念 demo。AI 编曲使用本地规则生成原创五声音阶音频，非模型调用、非客家真实原音；试听也为合成演示。展演与文创为内容预告，没有伪造直播、购物或上传成功。平台规模数字来自材料且在页面标注。

等待用户对首版风格反馈；之后补充真实演出视频、音频与文创素材。若接真实 AI 服务、账户或共享上传，需要独立后端；不要把密钥放进 GitHub Pages 前端。

## 2026-10-06 第二版

- 资源库已替换原灵感墙；resources.js 负责分类、搜索、收藏、详情和 GitHub 投稿。公开 open Issues 带 resource-approved 标签才在网站展示，resource-pending 为待审。真实文件暂由投稿者提供外部 HTTPS 链接。
- assets/field-recording.txt、assets/pentatonic-score.txt 为原创可下载资料。插画按 CC BY 4.0 分享，其余两份资料 CC0。
- composer.js 为增强作曲工作台；config.js 为公开配置。AI 模式未配置时禁用，不假装生成成功。
- server/music-server.mjs 为 Node.js 22+ 服务，代理 fal Stable Audio 2.5。需要 FAL_KEY、MUSIC_ACCESS_CODE 和 HTTPS 部署；目前均未开通。邀请码、限额和任务为单实例小范围试用设计，任务内存保存 30 分钟。
- tests/frontend.cjs 和 tests/music-server.test.mjs：前端 DOM 与模拟后端测试已通过，未调用付费模型，未完成真实浏览器视觉检查。
- 用户询问是否需要服务器及能否用个人电脑：已说明前端保留 GitHub Pages，个人电脑可以运行后台但需持续开机联网并配置公网访问；托管服务可替代自购服务器。用户尚未选定云服务或提供 AI 服务账号。
- 下一步：确认资源库希望采用 GitHub 投稿还是完整账号/上传系统，选择后台托管与存储服务，配置模型凭证后进行端到端验收。
