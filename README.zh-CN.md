# Creation Studio

Creation Studio 是一个基于 Angular 和 TUI Image Editor 的黑白灰风格图片编辑器，AI 生成通过本地 Hugging Face 代理完成。

英文版说明：[`README.md`](README.md)

## 这个项目能做什么

- 打开后会自动载入一张示例图，页面一进来就可以编辑。
- 可以上传本地图片，并在 TUI 画布里继续处理。
- 支持裁剪、旋转、文字、灰度、撤销、重做、拖动画布、缩放、重置和导出 PNG。
- 支持文生图和图生图，生成结果会自动作为新对象加入画布。

## 提交清单

- 完整源代码：当前公共 GitHub 仓库。
- 在线 Demo：[image-design-demo.vercel.app](https://image-design-demo.vercel.app/)。
- 中英双语文档：GitHub 默认展示英文版 [README.md](README.md)，本文件为中文版。
- 应用和 AI 生成内容截图：见 [docs/screenshots](docs/screenshots)。

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
2. 在底部输入 `A woman in a white dress standing in a bright studio, soft shadows, realistic photography.`，点击 `Generate`。
3. 生成图片会作为新对象加入画布。

### 图生图

1. 点击选中画布中的图片，确认出现橙黄色选框。
2. 输入 `Add a black hat to the woman while keeping the background and pose unchanged.`。
3. 点击 `Generate`。生成结果会作为新对象加入画布，原图保留。

## 设计决策

- 使用 Angular 管理应用外壳和状态，使用成熟的 TUI Image Editor 提供画布编辑能力。
- AI 请求统一经过服务端代理，确保 `HF_TOKEN` 不会进入浏览器代码或 Git 仓库。
- 文生图和图生图使用不同的请求结构与可配置模型。选中画布图片就是明确的模式切换，同一个 Prompt 输入框即可完成两条流程。
- 画布文档和 AI 历史保存在浏览器本地，刷新页面后仍可恢复，不需要账号或数据库。
- 界面保持 Creation 黑白灰风格，只用橙色表示当前选中对象，方便检查编辑目标。

## 开发挑战与解决方案

- TUI Image Editor 旋转时会改变内部画布尺寸。现在会在下一帧同步自定义视口，因此旋转 30 度时图片仍保持原始比例并位于画布中心。
- 图生图需要把浏览器中的 data URL 作为二进制图片发送给模型。代理会校验 data URL、转换为 `Blob`，并在服务端补充图像编辑约束。
- AI 服务可能较慢或暂时不可用。界面展示准备中、生成中、处理中三个阶段，并把鉴权、额度、限流等常见错误转换成可读提示；临时错误支持重试。
- AI 结果需要成为真正可编辑的画布对象。编辑器会把结果作为新对象加入并按工作区缩放，同时保留原图用于对比。

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
4. 保持默认示例图，并确认当前没有选中图片。
5. 输入 `A woman in a white dress standing in a bright studio, soft shadows, realistic photography.`，点击 `Generate`。
6. 确认页面出现加载状态，并确认新的 AI 图片加入画布。
7. 选中原始画布图片，输入 `Add a black hat to the woman while keeping the background and pose unchanged.`，再次点击 `Generate`。
8. 确认修改结果加入画布且原图仍保留，然后点击 `Export`，确认浏览器开始下载 PNG。

可以先用健康检查确认 API 配置，不会输出 Token：

```bash
curl http://127.0.0.1:4300/api/health
```

在真实生成前，返回结果应包含 `ok: true` 和 `configured: true`。

## 截图

- `docs/screenshots/text-to-image-generated.png`
- `docs/screenshots/image-to-image-generated.png`
- `docs/screenshots/desktop-generated.png`
- `docs/screenshots/mobile-open.png`
- `docs/screenshots/error-state.png`
