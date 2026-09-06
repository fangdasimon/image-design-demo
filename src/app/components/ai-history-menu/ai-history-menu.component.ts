import { AsyncPipe } from '@angular/common';
import { Component, EventEmitter, OnDestroy, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AiImageResult, STYLE_PRESETS, StylePreset } from '../../core/models/ai.models';
import { AiStateService } from '../../core/ai-state.service';

@Component({
  selector: 'app-ai-history-menu',
  standalone: true,
  imports: [AsyncPipe, MatButtonModule, MatIconModule, MatTooltipModule],
  template: `
    @if (state$ | async; as state) {
      <section class="history-menu" role="dialog" aria-label="AI controls and version history">
        <header class="history-header">
          <div>
            <strong>AI controls</strong>
          </div>
          <button mat-icon-button type="button" aria-label="Close AI controls" (click)="closed.emit()">
            <span class="creation-ui-icon creation-ui-icon--close" aria-hidden="true"></span>
          </button>
        </header>

        <section class="ai-controls" aria-label="AI generation controls">
          <div class="control-row">
            <span class="control-label">Mode</span>
            <div class="mode-switch" role="tablist" aria-label="Generation mode">
              <button
                type="button"
                role="tab"
                [class.is-active]="!state.sourceImage"
                [attr.aria-selected]="!state.sourceImage"
                [matTooltip]="state.sourceImage ? 'Switch to text-to-image mode' : ''"
                matTooltipClass="creation-top-tooltip"
                (click)="selectMode('text', state.sourceImage)"
              >Text to image</button>
              <button
                type="button"
                role="tab"
                [class.is-active]="!!state.sourceImage"
                [attr.aria-selected]="!!state.sourceImage"
                [attr.aria-disabled]="!state.sourceImage"
                [matTooltip]="state.sourceImage ? '' : 'Select an image on the canvas first'"
                matTooltipClass="creation-top-tooltip"
                (click)="selectMode('image', state.sourceImage)"
              >Image to image</button>
            </div>
          </div>
          <div class="control-grid">
            <label class="control-field" for="ai-provider">
              <span>Provider</span>
              <div class="select-control">
                <select id="ai-provider" value="huggingface" aria-label="AI provider">
                  <option value="huggingface">Hugging Face</option>
                  <option disabled>OpenAI · Coming soon</option>
                  <option disabled>Google Imagen · Coming soon</option>
                </select>
                <span class="select-chevron" aria-hidden="true"></span>
              </div>
            </label>
            <div class="control-field">
              <span>Model</span>
              <div id="ai-model" class="control-readout" role="status" aria-live="polite">{{ modelLabel(state) }}</div>
            </div>
            <label class="control-field" for="ai-style">
              <span>Style</span>
              <div class="select-control">
                <select id="ai-style" aria-label="Image style" (change)="onStylePresetChange($event)">
                  @for (preset of stylePresets; track preset.value) {
                    <option [value]="preset.value" [selected]="state.stylePreset === preset.value">{{ preset.label }}</option>
                  }
                </select>
                <span class="select-chevron" aria-hidden="true"></span>
              </div>
            </label>
            <label class="control-field" for="ai-batch">
              <span>Batch</span>
              <div class="select-control">
                <select id="ai-batch" value="1" aria-label="Batch generation count">
                  <option value="1">1 image</option>
                  <option value="2" disabled>2 images · Coming soon</option>
                  <option value="4" disabled>4 images · Coming soon</option>
                </select>
                <span class="select-chevron" aria-hidden="true"></span>
              </div>
            </label>
          </div>
          @if (styleDescription(state.stylePreset); as styleHint) {
            <small class="control-hint">{{ styleHint }}</small>
          }
        </section>

        <div class="versions-heading">
          <strong>AI versions</strong>
          <span>{{ state.history.length }} versions · {{ state.favorites.length }} saved</span>
        </div>

        <nav class="history-tabs" role="tablist" aria-label="AI version filters">
          <button type="button" role="tab" [class.is-active]="historyFilter === 'all'" [attr.aria-selected]="historyFilter === 'all'" (click)="historyFilter = 'all'">All</button>
          <button type="button" role="tab" [class.is-active]="historyFilter === 'favorites'" [attr.aria-selected]="historyFilter === 'favorites'" (click)="historyFilter = 'favorites'">Favorites <span>{{ state.favorites.length }}</span></button>
        </nav>

        @if (favoriteFeedback) {
          <div class="favorite-feedback" role="status" aria-live="polite">
            <mat-icon fontSet="material-symbols-outlined" data-icon="check">check</mat-icon>{{ favoriteFeedback }}
          </div>
        }

        @if (!visibleHistory(state.history).length) {
          <div class="history-empty">
            <mat-icon fontSet="material-symbols-outlined" data-icon="auto_awesome">auto_awesome</mat-icon>
            <span>{{ historyFilter === 'favorites' ? 'Favorite versions will appear here.' : 'Generated versions will appear here.' }}</span>
          </div>
        } @else {
          <div class="history-list">
            @for (image of visibleHistory(state.history); track image.id) {
              <article class="history-item" [class.is-favorite]="image.isFavorite">
                <img [src]="image.dataUrl" [alt]="'Generated result: ' + image.prompt" />
                <div class="history-copy">
                  <span class="prompt-text" [matTooltip]="image.prompt" matTooltipPosition="above" matTooltipClass="creation-history-tooltip">{{ image.prompt }}</span>
                  <button mat-button type="button" class="add-to-canvas" (click)="$event.stopPropagation(); addToCanvas.emit(image)">
                    <span>Add to canvas</span>
                  </button>
                </div>
                <div class="history-actions">
                  <button
                    mat-icon-button
                    type="button"
                    [class.is-favorite]="image.isFavorite"
                    [attr.aria-label]="image.isFavorite ? 'Remove result from favorites' : 'Save result to favorites'"
                    [attr.aria-pressed]="image.isFavorite"
                    (click)="$event.stopPropagation(); toggleFavorite(image)"
                  >
                    <mat-icon fontSet="material-symbols-outlined" [attr.data-icon]="image.isFavorite ? 'star' : 'star_border'">{{ image.isFavorite ? 'star' : 'star_border' }}</mat-icon>
                  </button>
                  <button mat-icon-button type="button" aria-label="Download result" (click)="$event.stopPropagation(); downloadImage(image)">
                    <mat-icon fontSet="material-symbols-outlined" data-icon="download">download</mat-icon>
                  </button>
                </div>
              </article>
            }
          </div>
        }
      </section>
    }
  `,
  styles: [`
    :host { position: absolute; top: calc(100% + 12px); right: 0; z-index: 40; display: block; }
    .history-menu { display: flex; flex-direction: column; width: min(380px, calc(100vw - 32px)); max-height: min(540px, calc(100dvh - 104px)); min-height: 0; overflow: hidden; border: 1px solid var(--line); border-radius: 6px; background: rgba(255, 255, 255, .98); color: var(--ink); box-shadow: 0 18px 40px rgba(0, 0, 0, .16); }
    .history-header { display: flex; align-items: center; justify-content: space-between; gap: 14px; border-bottom: 1px solid var(--line); padding: 11px 12px 10px 14px; }
    .history-header > div { display: grid; gap: 3px; min-width: 0; }
    .history-header strong { font-size: 12px; font-weight: 120; }
    .history-header span { color: var(--muted); font-size: 10px; }
    .history-header button { display: grid; place-items: center; width: 28px; height: 28px; flex: 0 0 auto; padding: 0; color: var(--muted); line-height: 1; }
    .ai-controls { display: grid; gap: 10px; border-bottom: 1px solid var(--line); padding: 12px 14px; }
    .control-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
    .control-label, .control-field > span { color: var(--muted); font-size: 9px; }
    .mode-switch { display: inline-flex; border: 1px solid var(--line); }
    .mode-switch button { min-height: 25px; display: inline-flex; align-items: center; border: 0; background: transparent; padding: 0 8px; color: var(--muted); cursor: pointer; font: inherit; font-size: 9px; }
    .mode-switch button + button { border-left: 1px solid var(--line); }
    .mode-switch button.is-active { background: var(--ink); color: var(--paper); cursor: default; }
    .mode-switch button[aria-disabled='true'] { cursor: not-allowed; }
    .control-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
    .control-field { display: grid; gap: 4px; min-width: 0; }
    .select-control { position: relative; min-width: 0; }
    .control-field select { width: 100%; min-width: 0; height: 30px; appearance: none; border: 1px solid var(--line); border-radius: 0; outline: 0; background: var(--paper); padding: 0 30px 0 7px; color: var(--ink); font: inherit; font-size: 10px; }
    .select-chevron { position: absolute; top: 50%; right: 11px; width: 7px; height: 7px; border-right: 1px solid var(--ink); border-bottom: 1px solid var(--ink); pointer-events: none; transform: translateY(-65%) rotate(45deg); }
    .control-readout { display: flex; align-items: center; min-width: 0; height: 30px; overflow: hidden; border: 1px solid var(--line); background: var(--primary-grey); padding: 0 7px; color: var(--ink); font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
    .control-field select:focus { border-color: var(--ink); }
    .control-field option:disabled { color: var(--muted); }
    .control-hint { color: var(--muted); font-size: 9px; line-height: 1.35; }
    .versions-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; padding: 11px 14px 7px; }
    .versions-heading strong { font-size: 12px; font-weight: 120; }
    .versions-heading span { color: var(--muted); font-size: 10px; text-align: right; }
    .history-tabs { display: flex; align-items: center; gap: 16px; border-bottom: 1px solid var(--line); padding: 0 14px; }
    .history-tabs button { position: relative; min-height: 34px; border: 0; background: transparent; padding: 0; color: var(--muted); cursor: pointer; font-size: 10px; }
    .history-tabs button.is-active { color: var(--ink); }
    .history-tabs button.is-active::after { position: absolute; right: 0; bottom: -1px; left: 0; height: 2px; background: var(--ink); content: ''; }
    .history-tabs button span { color: inherit; }
    .favorite-feedback { display: flex; align-items: center; gap: 5px; border-bottom: 1px solid var(--line); padding: 7px 14px; color: var(--ink); font-size: 10px; }
    .favorite-feedback mat-icon { --creation-icon-size: 14px; width: 14px; height: 14px; color: var(--accent); font-size: 14px; }
    .history-list { display: grid; flex: 1 1 auto; min-height: 0; gap: 0; overflow-x: hidden; overflow-y: auto; overscroll-behavior: contain; scrollbar-gutter: stable; }
    .history-list::-webkit-scrollbar { width: 6px; }
    .history-list::-webkit-scrollbar-thumb { background: var(--line-strong); }
    .history-list::-webkit-scrollbar-track { background: var(--primary-grey); }
    .history-item { display: grid; grid-template-columns: 54px minmax(0, 1fr) auto; align-items: stretch; gap: 9px; min-width: 0; border-bottom: 1px solid var(--line); padding: 9px 10px 9px 12px; }
    .history-item.is-favorite { background: #fffaf4; }
    .history-item:last-child { border-bottom: 0; }
    .history-item > img { width: 54px; height: 54px; border: 1px solid var(--line); background: var(--primary-grey); object-fit: cover; }
    .history-copy { display: grid; grid-template-rows: minmax(0, 1fr) 22px; align-content: stretch; min-width: 0; height: 54px; gap: 0; overflow: hidden; }
    .prompt-text { display: -webkit-box; max-height: 28px; overflow: hidden; color: var(--ink); font-size: 10px; line-height: 14px; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
    .add-to-canvas { align-self: end; justify-self: start; width: max-content; max-width: 100%; min-width: 0; height: 22px; min-height: 22px; margin: 0; overflow: hidden; border: 1px solid var(--ink); border-radius: 0; background: var(--paper); padding: 0 7px; color: var(--ink); font-size: 9px; line-height: 20px; text-overflow: ellipsis; white-space: nowrap; }
    .add-to-canvas:hover { background: var(--ink); color: var(--paper); }
    .history-actions { display: flex; align-items: center; justify-content: flex-end; min-width: 60px; gap: 4px; padding-top: 0; }
    .history-actions button { display: grid; place-items: center; flex: 0 0 28px; width: 28px; height: 28px; padding: 0; color: var(--muted); --mdc-icon-button-state-layer-size: 28px; }
    .history-actions button mat-icon { --creation-icon-size: 16px; display: block; width: 16px !important; height: 16px !important; font-size: 0 !important; line-height: 1; }
    .history-actions button mat-icon::before { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; line-height: 1; }
    .history-actions button mat-icon[data-icon='star']::before, .history-actions button mat-icon[data-icon='star_border']::before { transform: translateY(1px); }
    .history-actions button .mat-mdc-button-touch-target { width: 28px; height: 28px; }
    .history-actions button:hover, .history-actions button.is-favorite { color: var(--accent); }
    .history-actions button.is-favorite mat-icon { font-variation-settings: 'FILL' 1; }
    .history-empty { display: grid; justify-items: center; gap: 8px; padding: 32px 20px; color: var(--muted); font-size: 11px; text-align: center; }
    .history-empty mat-icon { --creation-icon-size: 22px; width: 22px; height: 22px; color: var(--ink); font-size: 22px; }
    @media (max-width: 767px) { :host { position: fixed; top: 66px; right: 8px; } .control-grid { gap: 6px; } .mode-switch button { padding-inline: 6px; } }
  `]
})
export class AiHistoryMenuComponent implements OnDestroy {
  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly addToCanvas = new EventEmitter<AiImageResult>();

  readonly state$ = this.stateService.state$;
  readonly stylePresets = STYLE_PRESETS;
  favoriteFeedback = '';
  historyFilter: 'all' | 'favorites' = 'all';
  private feedbackTimer?: ReturnType<typeof setTimeout>;

  constructor(private readonly stateService: AiStateService) {}

  ngOnDestroy(): void {
    if (this.feedbackTimer) clearTimeout(this.feedbackTimer);
  }

  toggleFavorite(image: AiImageResult): void {
    const nextValue = !image.isFavorite;
    this.stateService.toggleFavorite(image);
    this.favoriteFeedback = nextValue ? 'Saved to favorites' : 'Removed from favorites';
    if (this.feedbackTimer) clearTimeout(this.feedbackTimer);
    this.feedbackTimer = setTimeout(() => {
      this.favoriteFeedback = '';
      this.feedbackTimer = undefined;
    }, 1800);
  }

  visibleHistory(history: AiImageResult[]): AiImageResult[] {
    return this.historyFilter === 'favorites' ? history.filter((image) => image.isFavorite) : history;
  }

  modelLabel(state: { sourceImage: string | null }): string {
    return state.sourceImage ? 'Qwen Image Edit' : 'Stable Diffusion XL';
  }

  selectMode(mode: 'text' | 'image', sourceImage: string | null): void {
    if (mode === 'text') {
      this.stateService.setSourceImage(null);
      return;
    }
    if (!sourceImage) return;
  }

  onStylePresetChange(event: Event): void {
    const stylePreset = (event.target as HTMLSelectElement).value as StylePreset;
    if (this.stylePresets.some((preset) => preset.value === stylePreset)) this.stateService.setStylePreset(stylePreset);
  }

  styleDescription(stylePreset: StylePreset): string {
    return this.stylePresets.find((preset) => preset.value === stylePreset)?.description ?? '';
  }

  downloadImage(image: AiImageResult): void {
    const link = document.createElement('a');
    link.href = image.dataUrl;
    const format = image.dataUrl.match(/^data:image\/([a-z0-9.+-]+);/i)?.[1]?.toLowerCase() ?? 'png';
    const extension = format === 'jpeg' ? 'jpg' : format;
    link.download = `creation-ai-${new Date(image.createdAt).toISOString().replace(/[:.]/g, '-')}.${extension}`;
    link.click();
  }
}
