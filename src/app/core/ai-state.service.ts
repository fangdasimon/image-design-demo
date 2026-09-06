import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subscription, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AiImageService } from './ai-image.service';
import { AiImageResult, AiState, DEFAULT_AI_STATE, ProgressStage, STYLE_PRESETS, StylePreset } from './models/ai.models';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class AiStateService {
  private readonly stateSubject: BehaviorSubject<AiState>;
  readonly state$: Observable<AiState>;
  private generationSubscription?: Subscription;

  constructor(private readonly aiImageService: AiImageService, private readonly storage: StorageService) {
    const saved = this.storage.read();
    const savedHistory = saved.history ?? [];
    const savedFavoriteIds = saved.favorites ?? [];
    const validFavoriteIds = [...new Set(savedFavoriteIds)].filter((id) => savedHistory.some((item) => item.id === id));
    const restoredHistory = savedHistory.map((item) => ({ ...item, isFavorite: validFavoriteIds.includes(item.id) }));
    this.stateSubject = new BehaviorSubject<AiState>({
      ...DEFAULT_AI_STATE,
      ...saved,
      generatedImages: restoredHistory.slice(0, 6),
      history: restoredHistory,
      favorites: validFavoriteIds,
      isLoading: false,
      progressStage: 'idle',
      error: null
    });
    this.state$ = this.stateSubject.asObservable();
    if (validFavoriteIds.length !== savedFavoriteIds.length) this.persist();
  }

  get snapshot(): AiState {
    return this.stateSubject.value;
  }

  get isDemoMode(): boolean {
    return this.aiImageService.isDemoMode;
  }

  setPrompt(prompt: string): void {
    this.patch({ prompt, error: null });
  }

  setModel(selectedModel: string): void {
    this.patch({ selectedModel });
  }

  setStylePreset(stylePreset: StylePreset): void {
    this.patch({ stylePreset });
    this.persist();
  }

  setSourceImage(sourceImage: string | null): void {
    this.patch({ sourceImage });
  }

  setParameter(key: keyof AiState['modelParameters'], value: number): void {
    this.patch({ modelParameters: { ...this.snapshot.modelParameters, [key]: value } });
  }

  generate(): void {
    const state = this.snapshot;
    const prompt = state.prompt.trim();
    if (state.isLoading) {
      return;
    }
    if (!prompt) {
      this.patch({ error: { title: 'Prompt required', message: 'Describe the image you want to create first.', retryable: false } });
      return;
    }
    if (prompt.length > 240) {
      this.patch({ error: { title: 'Prompt too long', message: 'Keep your prompt within 240 characters.', retryable: false } });
      return;
    }

    this.generationSubscription?.unsubscribe();
    this.patch({ isLoading: true, progressStage: 'preparing', error: null });
    this.generationSubscription = timer(220)
      .pipe(
        switchMap(() => {
          this.patch({ progressStage: 'generating' });
          return this.aiImageService.generate(this.buildRequestPrompt(prompt, state.stylePreset), state.modelParameters, state.sourceImage);
        }),
        switchMap((result) => {
          this.patch({ progressStage: 'processing' });
          return timer(260).pipe(switchMap(() => [result]));
        })
      )
      .subscribe({
        next: (result) => {
          const image: AiImageResult = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            dataUrl: result.dataUrl,
            prompt,
            model: state.selectedModel,
            createdAt: Date.now(),
            isFavorite: false,
            source: result.source
          };
          const history = [image, ...this.snapshot.history.filter((item) => item.id !== image.id)].slice(0, 8);
          this.patch({ prompt: '', generatedImages: [image, ...this.snapshot.generatedImages].slice(0, 6), history, isLoading: false, progressStage: 'complete', error: null });
          this.persist();
        },
        error: (error) => {
          this.patch({ isLoading: false, progressStage: 'idle', error });
        }
      });
  }

  toggleFavorite(image: AiImageResult): void {
    const isFavorite = !this.snapshot.favorites.includes(image.id);
    const favorites = isFavorite ? [image.id, ...this.snapshot.favorites] : this.snapshot.favorites.filter((id) => id !== image.id);
    const update = (item: AiImageResult): AiImageResult => (item.id === image.id ? { ...item, isFavorite } : item);
    this.patch({
      favorites,
      generatedImages: this.snapshot.generatedImages.map(update),
      history: this.snapshot.history.map(update)
    });
    this.persist();
  }

  private patch(update: Partial<AiState>): void {
    this.stateSubject.next({ ...this.snapshot, ...update });
  }

  private buildRequestPrompt(prompt: string, stylePreset: StylePreset): string {
    const modifier = STYLE_PRESETS.find((preset) => preset.value === stylePreset)?.promptSuffix;
    return modifier ? `${prompt}, ${modifier}` : prompt;
  }

  private persist(): void {
    this.storage.write(this.snapshot);
  }
}
