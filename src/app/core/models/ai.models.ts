export type ProgressStage = 'idle' | 'preparing' | 'generating' | 'processing' | 'complete';

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
