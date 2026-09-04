# Creation Studio

Creation Studio 是一个基于 Angular 和 TUI Image Editor 的黑白灰风格图片编辑器，AI 生成通过本地 Hugging Face 代理完成。

英文版说明：[`README.md`](README.md)

## 这个项目能做什么

- 打开后会自动载入一张示例图，页面一进来就可以编辑。
- 可以上传本地图片，并在 TUI 画布里继续处理。
- 支持裁剪、旋转、文字、灰度、撤销、重做、拖动画布、缩放、重置和导出 PNG。
- 支持输入 Prompt 生成图片，生成结果会自动放回画布中。

## 运行要求

- Node.js 18.19+ 或更新版本
- npm
- 如果要使用真实 AI 生成，需要一个带 Inference Providers 权限的 Hugging Face Access Token

## 快速启动

```bash
npm install
cp server/.env.example server/.env
# 编辑 server/.env，把 HF_TOKEN 换成你自己的 token
npm run start:api
# 另开一个终端
npm start
```

浏览器打开 `http://localhost:4200`。

前端会把 `/api` 请求代理到 `http://127.0.0.1:4300`，所以真实生成时要一直保留 API 服务运行。

## 怎么用

1. 启动页面，等待默认示例图加载完成。
2. 使用顶部工具栏上传图片、撤销、重做或导出。
3. 使用画布左侧的 TUI 工具栏进行裁剪、旋转、文字、灰度等操作。
4. 在底部 AI 输入栏里输入 Prompt，然后点击 Generate。
5. 生成完成后，图片会自动加入画布。
6. 最后点击 Export 导出 PNG。

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

## 截图

- `docs/screenshots/desktop-generated.png`
- `docs/screenshots/mobile-open.png`
- `docs/screenshots/error-state.png`
