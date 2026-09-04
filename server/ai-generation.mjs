import { InferenceClient } from '@huggingface/inference';

const MAX_PROMPT_LENGTH = 240;

export function getAiConfig(env = process.env) {
  const configuredToken = (env.HF_TOKEN || '').trim();
  const token = configuredToken && !configuredToken.includes('your_rotated_token_here') ? configuredToken : '';

  return {
    client: token ? new InferenceClient(token) : null,
    textModel: env.HF_MODEL || 'stabilityai/stable-diffusion-xl-base-1.0',
    imageModel: env.HF_IMAGE_MODEL || 'Qwen/Qwen-Image-Edit-2509',
    imageProvider: env.HF_IMAGE_PROVIDER || 'fal-ai'
  };
}

export async function generateImage(body, config) {
  if (!config.client) {
    throw httpError(401, 'The AI proxy is running, but HF_TOKEN is not configured.', 'missing_token');
  }

  const requestBody = body && typeof body === 'object' ? body : {};
  const sourceImage = typeof requestBody.source_image === 'string' ? requestBody.source_image.trim() : '';
  const prompt = typeof requestBody.prompt === 'string'
    ? requestBody.prompt.trim()
    : !sourceImage && typeof requestBody.inputs === 'string'
      ? requestBody.inputs.trim()
      : '';
  const parameters = requestBody.parameters && typeof requestBody.parameters === 'object'
    ? requestBody.parameters
    : {};

  if (!prompt || prompt.length > MAX_PROMPT_LENGTH) {
    throw httpError(400, 'Prompt must contain 1 to 240 characters.', 'invalid_prompt');
  }

  const guidanceScale = clampNumber(parameters.guidance_scale, 1, 20, 7.5);
  const steps = clampNumber(parameters.num_inference_steps, 1, 50, 30);
  let image;

  if (sourceImage) {
    let inputImage;
    try {
      inputImage = dataUrlToBlob(sourceImage);
    } catch (error) {
      throw httpError(400, error instanceof Error ? error.message : 'Source image is invalid.', 'invalid_source_image');
    }

    const isQwenImageEdit = config.imageModel.toLowerCase().includes('qwen-image-edit');
    image = await config.client.imageToImage({
      provider: config.imageProvider,
      model: config.imageModel,
      inputs: inputImage,
      parameters: {
        prompt: buildImageEditPrompt(prompt),
        negative_prompt: 'anime, cartoon, manga, illustration, 2D style, 二次元, 动漫, 插画',
        guidance_scale: isQwenImageEdit ? 1 : guidanceScale,
        ...(isQwenImageEdit ? { true_cfg_scale: Math.min(4, guidanceScale) } : {}),
        num_inference_steps: steps
      }
    });
  } else {
    image = await config.client.textToImage({
      provider: 'auto',
      model: config.textModel,
      inputs: prompt,
      parameters: {
        guidance_scale: guidanceScale,
        num_inference_steps: steps
      }
    });
  }

  return {
    buffer: Buffer.from(await image.arrayBuffer()),
    contentType: image.type || 'image/png'
  };
}

export function getErrorStatus(error) {
  const status = Number(error?.status ?? error?.statusCode ?? error?.httpResponse?.status);
  if ([400, 401, 402, 403, 408, 413, 429].includes(status) || status >= 500) return status;
  return 502;
}

export function getErrorCode(status, error) {
  if (typeof error?.code === 'string') return error.code;
  if (status === 401 || status === 403) return 'authentication';
  if (status === 402) return 'quota_exhausted';
  if (status === 429) return 'rate_limit';
  if (status >= 500) return 'provider_unavailable';
  return 'provider_error';
}

export function getSafeErrorMessage(error, status) {
  if (error?.code === 'missing_token') return 'Hugging Face token is not configured. Add HF_TOKEN to the deployment environment.';
  if (status === 401 || status === 403) return 'The Hugging Face token was rejected or lacks Inference Providers permission.';
  if (status === 402) return 'Hugging Face Inference Providers monthly credits are exhausted. Add credits or use another provider.';
  if (status === 429) return 'The model quota is busy. Wait a moment and try again.';
  if (status >= 500) return 'The selected Hugging Face provider is temporarily unavailable.';
  return error instanceof Error ? error.message : 'The AI provider returned an unknown error.';
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

function dataUrlToBlob(dataUrl) {
  const match = /^data:(image\/(?:png|jpe?g|webp|gif));base64,([A-Za-z0-9+/=\r\n]+)$/.exec(dataUrl);
  if (!match) throw new Error('Source image must be a base64 image data URL.');

  const bytes = Buffer.from(match[2].replace(/\s/g, ''), 'base64');
  if (!bytes.length) throw new Error('Source image is empty.');
  return new Blob([bytes], { type: match[1] === 'image/jpg' ? 'image/jpeg' : match[1] });
}

function buildImageEditPrompt(prompt) {
  return `请直接编辑输入图片，清晰完成以下要求：${prompt}。保持原图人物身份、脸部、服装、构图、背景、光线和真实摄影风格不变，除非要求明确修改。不要生成二次元、动漫或插画风格。`;
}

function httpError(status, message, code) {
  return Object.assign(new Error(message), { status, code });
}
