import { Injectable } from '@angular/core';
import { AiImageResult, AiState, DEFAULT_AI_STATE } from './models/ai.models';

interface PersistedAiState {
  prompt: string;
  selectedModel: string;
  modelParameters: AiState['modelParameters'];
  history: AiImageResult[];
  favorites: string[];
}

@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly storageKey = 'creation-studio-ai-state-v1';

  read(): Partial<AiState> {
    if (typeof localStorage === 'undefined') {
      return {};
    }

    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) {
        return {};
      }

      const parsed = JSON.parse(raw) as Partial<PersistedAiState>;
      return {
        prompt: typeof parsed.prompt === 'string' ? parsed.prompt : DEFAULT_AI_STATE.prompt,
        selectedModel: typeof parsed.selectedModel === 'string' ? parsed.selectedModel : DEFAULT_AI_STATE.selectedModel,
        modelParameters: parsed.modelParameters ?? DEFAULT_AI_STATE.modelParameters,
        history: Array.isArray(parsed.history) ? parsed.history.slice(0, 8) : [],
        favorites: Array.isArray(parsed.favorites) ? parsed.favorites : []
      };
    } catch {
      return {};
    }
  }

  write(state: AiState): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    const persisted: PersistedAiState = {
      prompt: state.prompt,
      selectedModel: state.selectedModel,
      modelParameters: state.modelParameters,
      history: state.history.slice(0, 8),
      favorites: state.favorites
    };

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(persisted));
    } catch {
      // Large generated images can exceed storage limits. Keep a small recovery copy.
      try {
        localStorage.setItem(this.storageKey, JSON.stringify({ ...persisted, history: persisted.history.slice(0, 2) }));
      } catch {
        // Storage is optional and must never block the editor.
      }
    }
  }
}
