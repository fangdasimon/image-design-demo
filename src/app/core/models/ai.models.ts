export type ProgressStage = 'idle' | 'preparing' | 'generating' | 'processing' | 'complete';
export type StylePreset = 'original' | 'editorial' | 'monochrome' | 'soft-light';

export const STYLE_PRESETS: ReadonlyArray<{ value: StylePreset; label: string; promptSuffix: string; description: string }> = [
  { value: 'original', label: 'Original', promptSuffix: '', description: '' },
  { value: 'editorial', label: 'Editorial', promptSuffix: 'editorial photography, refined composition, controlled studio light', description: 'Adds refined editorial composition and studio light' },
  { value: 'monochrome', label: 'Monochrome', promptSuffix: 'monochrome black and white, tonal contrast, restrained palette', description: 'Adds black-and-white contrast and a restrained palette' },
  { value: 'soft-light', label: 'Soft light', promptSuffix: 'soft natural light, gentle shadows, calm atmosphere', description: 'Adds soft natural light and gentle shadows' }
];

export interface AiImageResult {
  id: string;
  dataUrl: string;
  prompt: string;
  model: string;
  createdAt: number;
  isFavorite: boolean;
  source: 'api' | 'demo';
}

export interface AiError {
  title: string;
  message: string;
  retryable: boolean;
}

export interface AiState {
  prompt: string;
  selectedModel: string;
  stylePreset: StylePreset;
  modelParameters: {
    guidanceScale: number;
    steps: number;
  };
  generatedImages: AiImageResult[];
  history: AiImageResult[];
  favorites: string[];
  isLoading: boolean;
  progressStage: ProgressStage;
  error: AiError | null;
  sourceImage: string | null;
}

export const DEFAULT_PROMPTS = [
  'A woman in a white dress standing in a bright studio, soft shadows, realistic photography.',
  'Monochrome architectural study with soft shadows',
  'Quiet still life with paper, glass and natural light'
];

export const DEFAULT_AI_STATE: AiState = {
  prompt: DEFAULT_PROMPTS[0],
  selectedModel: 'stable-diffusion-xl',
  stylePreset: 'original',
  modelParameters: {
    guidanceScale: 7.5,
    steps: 30
  },
  generatedImages: [],
  history: [],
  favorites: [],
  isLoading: false,
  progressStage: 'idle',
  error: null,
  sourceImage: null
};
