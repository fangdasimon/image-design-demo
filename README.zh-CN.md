cropcrop

# Creation Studio

Creation Studio 是一个基于 Angular 和 TUI Image Editor 的黑白灰风格图片编辑器，AI 生成通过本地 Hugging Face 代理完成。

英文版说明：[`README.md`](README.md)

## 这个项目能做什么

- 打开后会自动载入一张示例图，页面一进来就可以编辑。
- 可以上传本地图片，并在 TUI 画布里继续处理。
- 支持裁剪、旋转、文字、灰度、撤销、重做、拖动画布、缩放、重置和导出 PNG。
- 支持文生图和图生图，生成结果会自动作为新对象加入画布。

## 运行要求

- Node.js 18.19+ 或更新版本
- npm
- 如果要使用真实 AI 生成，需要一个带 Inference Providers 权限且仍有可用额度的 Hugging Face Access Token
- 图生图默认使用支持中文提示词的 `Qwen/Qwen-Image-Edit-2509`

## 快速启动

```bash
npm install
cp server/.env.example server/.env
# 编辑 server/.env，把 HF_TOKEN 换成你自己的 token；HF_MODEL 控制文生图，HF_IMAGE_MODEL 控制图生图
npm run start:api
# 另开一个终端
npm start
```

浏览器打开 `http://localhost:4200`。

前端会把 `/api` 请求代理到 `http://127.0.0.1:4300`，所以真实生成时要一直保留 API 服务运行。

## 部署到 Vercel

项目已包含 `vercel.json`，并为 `/api/health` 和 `/api/ai/generate` 提供 Vercel Functions。

1. 将最新代码提交并推送到 GitHub，然后在 Vercel 导入该仓库。
2. 保持项目根目录为仓库根目录，Vercel 可以自动识别 Angular。
3. 在 Vercel 的 Project Settings 中添加以下环境变量：

```text
HF_TOKEN=你的 Hugging Face Token
HF_MODEL=stabilityai/stable-diffusion-xl-base-1.0
HF_IMAGE_MODEL=Qwen/Qwen-Image-Edit-2509
HF_IMAGE_PROVIDER=fal-ai
```

4. 点击 Deploy。生成的 `vercel.app` 链接会从同一个域名提供编辑器和 `/api` 接口。

不要提交 `server/.env`，也不要把 `HF_TOKEN` 放入前端环境变量。

## 怎么用

### 编辑画布

- 顶部工具栏：上传图片、撤销、重做、导出。
- 左侧工具栏：`resize`、`crop`、`flip`、`rotate`、`draw`、`shape`、`icon`、`text`、`mask`、`filter`。
- 右侧工具栏：缩放、平移、重置、删除。选中图片后可以移动、缩放或旋转，当前选中框为橙黄色。

### 文生图

1. 不选中画布中的图片。
2. 在底部输入 Prompt，点击 `Generate`。
3. 生成图片会作为新对象加入画布。

### 图生图

1. 点击选中画布中的图片，确认出现橙黄色选框。
2. 输入修改要求，例如：`保持原图真实摄影风格，给人物戴一顶帽子。`
3. 点击 `Generate`。生成结果会作为新对象加入画布，原图保留。

## 离线 Demo 模式

如果你暂时没有 Hugging Face Token，也可以先看完整界面流程。把 `src/environments/environment.ts` 改成：

```ts
aiMode: 'demo'
```

然后只运行：

```bash
npm start
```

Demo 模式不依赖网络，也能跑通编辑器和生成流程，只是返回的是固定示例图。

## 验收步骤

可以按下面的步骤检查整个项目是否跑通：

1. 先启动 `npm run start:api`。
2. 再启动 `npm start`。
3. 打开 `http://localhost:4200`。
4. 上传一张图片，或者直接使用默认示例图。
5. 输入一个 Prompt，比如 `Minimal editorial portrait in sculptural light`。
6. 点击 Generate，确认页面出现加载状态。
7. 等待生成结果出现在画布中。
8. 点击 Export，确认浏览器开始下载 PNG。

可以先用健康检查确认 API 配置，不会输出 Token：

```bash
curl http://127.0.0.1:4300/api/health
```

在真实生成前，返回结果应包含 `ok: true` 和 `configured: true`。

## 截图

- `docs/screenshots/desktop-generated.png`
- `docs/screenshots/mobile-open.png`
- `docs/screenshots/error-state.png`
