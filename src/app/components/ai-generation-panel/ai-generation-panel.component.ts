import { AsyncPipe } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';
import { Subscription } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { AiError, AiImageResult } from '../../core/models/ai.models';
import { AiStateService } from '../../core/ai-state.service';
import { CreationIconComponent } from '../creation-icon/creation-icon.component';

@Component({
  selector: 'app-ai-generation-panel',
  standalone: true,
  imports: [AsyncPipe, CreationIconComponent, MatButtonModule, MatProgressBarModule],
  template: `
    @if (state$ | async; as state) {
      <form class="composer-form" [class.image-to-image]="!!state.sourceImage" [attr.aria-label]="state.sourceImage ? 'Image-to-image prompt' : 'Text-to-image prompt'" [attr.aria-busy]="state.isLoading" (submit)="submitPrompt($event)">
        <app-creation-icon class="composer-icon" [name]="state.sourceImage ? 'image' : 'sparkle'"></app-creation-icon>
        <div class="prompt-field">
          <label class="sr-only" for="image-prompt">Image prompt</label>
          <input id="image-prompt" class="prompt-control" type="text" name="prompt" maxlength="240" autocomplete="off" [value]="state.prompt" (input)="onPromptInput($event)" [placeholder]="state.sourceImage ? 'Describe how to transform the selected image' : 'Describe an image to create'" />
        </div>
        <span class="prompt-count">{{ state.prompt.length }}/240</span>
        <button mat-flat-button class="generate-button" type="submit" [disabled]="state.isLoading || !state.prompt.trim()" [attr.aria-label]="state.isLoading ? 'Generating image' : 'Generate image'">
          <app-creation-icon [name]="state.isLoading ? 'loading' : 'sparkle'" [class.is-loading]="state.isLoading"></app-creation-icon>
          <span>{{ state.isLoading ? 'Creating' : 'Generate' }}</span>
        </button>
      </form>

      @if (state.isLoading) {
        <div class="progress-wrap" aria-live="polite">
          <mat-progress-bar mode="indeterminate"></mat-progress-bar>
          <span>{{ progressLabel(state.progressStage) }}</span>
        </div>
      }

    }
  `,
  styles: [`
    :host { display: block; width: 100%; }
    .composer-form { display: flex; align-items: center; gap: 9px; min-height: 44px; }
    .composer-icon { width: 19px; height: 19px; flex: 0 0 auto; color: var(--muted); }
    .prompt-field { min-width: 0; flex: 1; display: flex; align-items: center; padding-right: 4px; overflow: hidden; }
    .prompt-control { display: block; width: 100%; min-width: 0; height: 40px; border: 0; outline: 0; padding: 0 4px 0 2px; background: transparent; color: var(--ink); caret-color: var(--ink); font-size: 13px; }
    .prompt-control::placeholder { color: var(--muted); opacity: 1; }
    .prompt-count { flex: 0 0 auto; color: var(--muted); font-size: 10px; white-space: nowrap; }
    .generate-button { display: inline-grid; place-items: center; height: 36px; min-height: 36px; flex: 0 0 auto; border-radius: 20px; background: var(--ink) !important; color: var(--paper) !important; padding: 0 14px; --mdc-filled-button-container-color: var(--ink); --mdc-filled-button-disabled-container-color: var(--ink); --mdc-filled-button-label-text-color: var(--paper); --mdc-filled-button-disabled-label-text-color: var(--paper); font-size: 11px; line-height: 1; opacity: 1; }
    .generate-button:hover:not([disabled]) { background: #272727; }
    :host ::ng-deep .generate-button .mdc-button__label { display: flex !important; flex-direction: row; align-items: center; justify-content: center; height: 100%; line-height: 1; }
    .generate-button app-creation-icon { display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; flex: 0 0 16px; margin-right: 5px; }
    .generate-button app-creation-icon.is-loading { animation: composer-spin 900ms linear infinite; }
    .progress-wrap { display: grid; gap: 5px; padding: 4px 0 0 28px; color: var(--muted); font-size: 10px; }
    .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; }
    @keyframes composer-spin { to { transform: rotate(360deg); } }
    @media (max-width: 600px) {
      .prompt-count { display: none; }
    }
  `]
})
export class AiGenerationPanelComponent implements OnDestroy {
  private sourceImageValue: string | null = null;

  @Input()
  set sourceImage(value: string | null) {
    const normalizedValue = value || null;
    if (normalizedValue === this.sourceImageValue) return;
    this.sourceImageValue = normalizedValue;
    this.stateService.setSourceImage(normalizedValue);
  }

  @Output() readonly imageGenerated = new EventEmitter<AiImageResult>();
  @Output() readonly errorNotice = new EventEmitter<AiError>();

  readonly state$ = this.stateService.state$;
  private readonly stateSubscription: Subscription;
  private lastEmittedImageId: string | null;
  private lastEmittedErrorKey = '';
  private generateDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(readonly stateService: AiStateService) {
    this.lastEmittedImageId = this.stateService.snapshot.generatedImages[0]?.id ?? null;
    this.stateSubscription = this.state$.subscribe((state) => {
      const newestImage = state.generatedImages[0];
      if (newestImage && newestImage.id !== this.lastEmittedImageId) {
        this.lastEmittedImageId = newestImage.id;
        this.imageGenerated.emit(newestImage);
      }

      if (!state.error) {
        this.lastEmittedErrorKey = '';
        return;
      }

      const errorKey = `${state.error.title}:${state.error.message}`;
      if (errorKey === this.lastEmittedErrorKey) return;
      this.lastEmittedErrorKey = errorKey;
      this.errorNotice.emit(state.error);
    });
  }

  ngOnDestroy(): void {
    if (this.generateDebounceTimer) clearTimeout(this.generateDebounceTimer);
    this.stateSubscription.unsubscribe();
  }

  progressLabel(stage: string): string {
    const labels: Record<string, string> = { preparing: 'Preparing', generating: 'Generating', processing: 'Processing', complete: 'Complete' };
    return labels[stage] ?? 'Ready';
  }

  submitPrompt(event: Event): void {
    event.preventDefault();
    this.queueGeneration();
  }

  onPromptInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const selectionStart = input.selectionStart;
    const selectionEnd = input.selectionEnd;

    this.stateService.setPrompt(input.value);

    // State updates can reset a native input's horizontal scroll position. Restore
    // the caret and scroll after the value has been reflected in the view.
    if (selectionStart == null || selectionEnd == null) return;
    window.requestAnimationFrame(() => {
      if (document.activeElement !== input) return;
      input.setSelectionRange(selectionStart, selectionEnd);
      if (selectionEnd === input.value.length) input.scrollLeft = input.scrollWidth;
    });
  }

  queueGeneration(): void {
    if (this.stateService.snapshot.isLoading) return;

    if (this.generateDebounceTimer) clearTimeout(this.generateDebounceTimer);
    this.generateDebounceTimer = setTimeout(() => {
      this.generateDebounceTimer = null;
      this.stateService.generate();
    }, 300);
  }

}
