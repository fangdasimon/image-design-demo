# Creation Studio

Creation Studio is a black-and-white Angular image editor built around TUI Image Editor and a local Hugging Face proxy.

Chinese guide: [README.zh-CN.md](README.zh-CN.md)

## What it does

- Opens with a built-in sample artwork so the canvas is ready immediately.
- Lets you upload a local image and edit it on the TUI canvas.
- Supports crop, rotate, text, grayscale, undo, redo, pan, zoom, reset, and PNG export.
- Sends prompt-based image generation through a local Node proxy and adds the result back to the canvas.

## Requirements

- Node.js 18.19+ or newer
- npm
- A Hugging Face access token with Inference Providers permission for real AI generation

## Quick start

```bash
npm install
cp server/.env.example server/.env
# edit server/.env and replace HF_TOKEN with your token
npm run start:api
# in a second terminal
npm start
```

Open `http://localhost:4200`.

The front end proxies `/api` requests to `http://127.0.0.1:4300`, so the API server must stay running while you use real generation.

## How to use the editor

1. Start the app and wait for the sample canvas to load.
2. Use the top bar to upload an image, undo, redo, or export.
3. Use the built-in TUI toolbar on the left side of the canvas for crop, rotate, text, grayscale, and other canvas actions.
4. Type a prompt in the AI bar at the bottom and click Generate.
5. When generation finishes, the image is inserted into the canvas automatically.
6. Export the finished canvas as PNG.

## Offline demo mode

If you do not have a Hugging Face token, you can still run the UI by switching `src/environments/environment.ts` to:

```ts
aiMode: 'demo'
```

Then run only:

```bash
npm start
```

Demo mode keeps the full editor flow usable without network access and returns a deterministic sample image.

## Smoke test

Use these steps to verify the project works end to end:

1. Start `npm run start:api`.
2. Start `npm start`.
3. Open `http://localhost:4200`.
4. Upload an image or keep the default sample.
5. Enter a prompt such as `Minimal editorial portrait in sculptural light`.
6. Click Generate and confirm the loading state appears.
7. Wait for the generated image to appear on the canvas.
8. Click Export and confirm a PNG download starts.

## Screenshots

- `docs/screenshots/desktop-generated.png`
- `docs/screenshots/mobile-open.png`
- `docs/screenshots/error-state.png`
