# Creation Studio

Creation Studio 是一个基于 Angular 和 TUI Image Editor 的黑白灰风格图片编辑器，AI 生成通过本地 Hugging Face 代理完成。

英文版说明：[`README.md`](README.md)

## 这个项目能做什么

- 打开后会自动载入一张示例图，页面一进来就可以编辑。
- 可以上传本地图片，并在 TUI 画布里继续处理。
- 支持裁剪、旋转、文字、灰度、撤销、重做、拖动画布、缩放、重置和导出 PNG。
- 支持文生图和图生图，生成结果会自动作为新对象加入画布，并可从右上角 AI 版本历史查看。

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

- 顶部工具栏：上传图片、AI 控制、版本历史、导出。撤销和重做仍可在编辑器工具栏及移动端工具中使用。
- 左侧工具栏：`resize`、`crop`、`flip`、`rotate`、`draw`、`shape`、`icon`、`text`、`mask`、`filter`。
- 右侧工具栏：缩放、平移、重置、删除。选中图片后可以移动、缩放或旋转，当前选中框为橙黄色。
- 窄屏下点击右下角工具按钮，可以使用上传、裁剪、文字、灰度、旋转、撤销和重做，不会遮挡画布。

### 文生图

1. 不选中画布中的图片。
2. 在底部输入 `A woman in a white dress standing in a bright studio, soft shadows, realistic photography.`，点击 `Generate`。
3. 生成图片会作为新对象加入画布。点击右上角 AI 控制，可以查看当前模型和风格；下方 AI 版本区域支持收藏、下载和再次加入画布。

### 图生图

1. 点击选中画布中的图片，确认出现橙黄色选框。
2. 输入 `Add a black hat to the woman while keeping the background and pose unchanged.`。
3. 点击 `Generate`。生成结果会作为新对象加入画布，原图保留。

## 设计决策

- 使用 Angular 管理应用状态和工作流界面，使用成熟的 TUI Image Editor 提供画布基础能力。这样可以把重点放在 AI 编辑流程上，不需要重新实现选中、裁剪和变换。
- 将 AI 配置和相关操作收拢到右上角的一个 AI 控制入口：模式、Provider、模型、风格、批量状态、版本历史、收藏、下载和重新加入画布都集中在这里。底部 Prompt 保持为唯一的生成入口，是否选中图片自动决定执行文生图还是图生图。
- AI 请求统一经过服务端代理，Token 和 Provider 配置放在环境变量中。浏览器不需要接触凭证，同一套接口可以同时服务本地和 Vercel。
- 当画布上有很多生成结果时，增加可选的 Overview/地图提供全局预览，避免用户只能在当前视口中盲目寻找。地图展示内容边界和当前视口，并支持点击或拖动快速定位主画布。

## 开发挑战与解决方案

- **挑战：TUI 的图片模型与产品需要的图片模型不同。** TUI 把加载的图片当作内部画布图片，但产品需要它成为可以选中、并能与 AI 结果对比的 Fabric 图片对象。**解决：**保留 TUI 内部图片作为画布尺寸来源，同时添加一个对应的可见对象负责选中，并把尺寸、滤镜操作桥接到当前对象。旋转以及撤销/重做后，再通过下一帧同步自定义视口。尺寸输入框还会拦截 Backspace/Delete，避免它们触发 TUI 的全局删除快捷键，解决编辑数值时图片被误删的问题。
- **挑战：无限画布、缩放、旋转与缩略图坐标同步。** 当画布上积累了很多结果时，用户很难快速找到某个产物，也无法直观看出是否还有其他生成结果。Overview/地图需要包含多个对象和旋转后的边界，在主画布缩放或平移时同步当前视口，还要支持定位但不能接管编辑器。**解决：**根据画布对象和视口计算世界边界，用临时画布生成派生预览，渲染后恢复主 Fabric 画布状态，再通过动画帧和 `ResizeObserver` 同步完整预览与视口变化。点击或拖动地图时，将地图坐标换算回主画布视口。

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
6. 确认页面出现加载状态，并确认新的 AI 图片加入画布且出现在右上角 AI 控制下方的版本区域中。
7. 选中原始画布图片，输入 `Add a black hat to the woman while keeping the background and pose unchanged.`，再次点击 `Generate`。
8. 确认修改结果加入画布且原图仍保留，然后点击 `Export`，确认浏览器开始下载 PNG。
9. 将浏览器调整到移动端宽度，打开工具按钮，确认上传、裁剪、文字、灰度、旋转、撤销和重做仍可使用。

可以先用健康检查确认 API 配置，不会输出 Token：

```bash
curl http://127.0.0.1:4300/api/health
```

在真实生成前，返回结果应包含 `ok: true` 和 `configured: true`。

## 截图

### AI 工作流总览

下面这张画布截图展示了完整的 AI 使用流程：

![Creation Studio 三图 AI 工作流](docs/screenshots/ai-workflow-overview.png)

从左到右依次是：

1. 文生图结果，使用提示词 `A woman in a white dress standing in a bright studio, soft shadows, realistic photography.`。
2. 编辑器打开时默认加载的图片，也是图生图示例使用的原图。
3. 基于中间默认图片生成的图生图结果，使用提示词 `Add a black hat to the woman while keeping the background and pose unchanged.`。

### 文生图

当画布中没有选中图片时，底部 Prompt 会执行文生图，并把新的结果作为可继续编辑的画布对象加入。

![Creation Studio 文生图结果](docs/screenshots/text-to-image-generated.png)

### 图生图

当选中原图时，同一个 Prompt 输入框会执行图生图。下面的示例给人物增加黑色帽子，同时保持原背景和姿势，原图也会保留在下方方便对比。

![Creation Studio 图生图结果](docs/screenshots/image-to-image-generated.png)
