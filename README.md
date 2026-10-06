# 客韵 · 客家文化全球共创平台

基于三张项目参考素材制作的响应式网站 demo，使用 HTML、CSS 和原生 JavaScript，部署到 GitHub Pages。

## 本地预览

```sh
python3 -m http.server 8000
```

访问 http://localhost:8000 。无需安装依赖或构建。

## 功能

- 公益展演栏目与详情弹窗
- 数字音乐馆分类、搜索和合成旋律试听
- 共创工作台：描述、风格和时长决定本地规则旋律，支持 WAV 下载
- 共创灵感保存到当前浏览器的 localStorage
- 文创概念展示与移动端适配

这是概念 demo：没有接入 AI 模型、真实展演视频、真实客家录音、多语翻译、交易或云端上传。平台数字来自参考材料，不代表本站实际资源量。试听音频为程序生成的原创演示旋律。山水土楼图为项目绘制的 SVG 艺术示意，文创袋由 CSS 绘制。Google Fonts 不可访问时自动回退到系统字体。

## 发布

仓库 Settings → Pages → Source 选择 GitHub Actions。推送 main 分支后自动发布。工作流仅上传网页文件与 assets，不发布原始参考图片。

线上地址：https://czx1220.github.io/hakka-culture/
