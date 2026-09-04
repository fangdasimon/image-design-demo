# Creation Studio

Creation Studio is a black-and-white Angular image editor built around TUI Image Editor and a local Hugging Face proxy.

Chinese guide: [README.zh-CN.md](README.zh-CN.md)

## What it does

- Opens with a built-in sample artwork so the canvas is ready immediately.
- Lets you upload a local image and edit it on the TUI canvas.
- Supports crop, rotate, text, grayscale, undo, redo, pan, zoom, reset, and PNG export.
- Supports text-to-image and image-to-image generation, with results inserted into the canvas as new objects.

## Requirements

- Node.js 18.19+ or newer
- npm
- A Hugging Face access token with Inference Providers permission and available quota for real AI generation
- Image-to-image uses the Chinese-capable `Qwen/Qwen-Image-Edit-2509` by default

## Quick start

```bash
npm install
cp server/.env.example server/.env
# edit server/.env and replace HF_TOKEN with your token; HF_MODEL controls text-to-image and HF_IMAGE_MODEL controls image-to-image
npm run start:api
# in a second terminal
npm start
```

Open `http://localhost:4200`.

The front end proxies `/api` requests to `http://127.0.0.1:4300`, so the API server must stay running while you use real generation.

## Deploy to Vercel

The repository includes `vercel.json` and Vercel Functions for `/api/health` and `/api/ai/generate`.

1. Commit and push the latest code to GitHub, then import the repository into Vercel.
2. Keep the project root as the repository root. Vercel can detect Angular automatically.
3. Add these environment variables in Vercel Project Settings:

```text
HF_TOKEN=your_hugging_face_token
HF_MODEL=stabilityai/stable-diffusion-xl-base-1.0
HF_IMAGE_MODEL=Qwen/Qwen-Image-Edit-2509
HF_IMAGE_PROVIDER=fal-ai
```

4. Deploy. The generated `vercel.app` URL serves the editor and its `/api` functions from the same origin.

Never commit `server/.env` or put `HF_TOKEN` in frontend environment variables.

## How to use the editor

### Edit the canvas

- Top bar: upload, undo, redo, and export.
- Left toolbar: `resize`, `crop`, `flip`, `rotate`, `draw`, `shape`, `icon`, `text`, `mask`, and `filter`.
- Right toolbar: zoom, pan, reset, and delete. Select an image to move, resize, or rotate it; the active selection is orange.

### Text-to-image

1. Leave every canvas image unselected.
2. Enter a prompt in the bottom AI bar and click `Generate`.
3. The generated image is added to the canvas as a new object.

### Image-to-image

1. Select a canvas image and confirm the orange selection box.
2. Enter an edit instruction, for example: `Keep the original photorealistic style and add a hat to the person.`
3. Click `Generate`. The edited result is added as a new object and the original remains.

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

The API can be checked without exposing the token:

```bash
curl http://127.0.0.1:4300/api/health
```

The response should report `ok: true` and `configured: true` before testing real generation.

## Screenshots

- `docs/screenshots/desktop-generated.png`
- `docs/screenshots/mobile-open.png`
- `docs/screenshots/error-state.png`
