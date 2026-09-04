import { AsyncPipe } from '@angular/common';
import { Component, EventEmitter, OnDestroy, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AiImageResult } from '../../core/models/ai.models';
import { AiStateService } from '../../core/ai-state.service';

@Component({
  selector: 'app-ai-generation-panel',
  standalone: true,
  imports: [AsyncPipe, FormsModule, MatButtonModule, MatIconModule, MatProgressBarModule, MatTooltipModule],
  template: `
    @if (state$ | async; as state) {
      <form class="composer-form" (submit)="submitPrompt($event)">
        <mat-icon class="composer-icon" fontSet="material-symbols-outlined" aria-hidden="true">auto_awesome</mat-icon>
        <label class="sr-only" for="image-prompt">Image prompt</label>
        <input id="image-prompt" class="prompt-control" type="text" name="prompt" maxlength="240" autocomplete="off" [ngModel]="state.prompt" (ngModelChange)="stateService.setPrompt($event)" placeholder="Describe an image to create" />
        <span class="prompt-count">{{ state.prompt.length }}/240</span>
        <button mat-flat-button class="generate-button" type="submit" [disabled]="state.isLoading || !state.prompt.trim()" [attr.aria-label]="state.isLoading ? 'Generating image' : 'Generate image'">
          <mat-icon fontSet="material-symbols-outlined" [class.is-loading]="state.isLoading">{{ state.isLoading ? 'progress_activity' : 'auto_awesome' }}</mat-icon>
          <span>{{ state.isLoading ? 'Creating' : 'Generate' }}</span>
        </button>
      </form>

      @if (state.isLoading) {
        <div class="progress-wrap" aria-live="polite">
          <mat-progress-bar mode="indeterminate"></mat-progress-bar>
          <span>{{ progressLabel(state.progressStage) }}</span>
        </div>
      }

      @if (state.error; as error) {
        <div class="error-box" role="alert">
          <mat-icon fontSet="material-symbols-outlined">warning</mat-icon>
          <span><strong>{{ error.title }}</strong> {{ error.message }}</span>
          @if (error.retryable) {
            <button mat-icon-button type="button" aria-label="Retry generation" matTooltip="Retry" (click)="stateService.generate()">
              <mat-icon fontSet="material-symbols-outlined">refresh</mat-icon>
            </button>
          }
        </div>
      }
    }
  `,
  styles: [`
    :host { display: block; width: 100%; }
    .composer-form { display: flex; align-items: center; gap: 9px; min-height: 44px; }
    .composer-icon { width: 19px; height: 19px; flex: 0 0 auto; color: var(--muted); font-size: 19px; }
    .prompt-control { min-width: 0; flex: 1; height: 40px; border: 0; outline: 0; background: transparent; color: var(--ink); font-size: 13px; }
    .prompt-control::placeholder { color: var(--muted); opacity: 1; }
    .prompt-count { flex: 0 0 auto; color: var(--muted); font-size: 10px; white-space: nowrap; }
    .generate-button { min-height: 36px; flex: 0 0 auto; border-radius: 20px; background: var(--ink); color: var(--paper); padding: 0 14px; font-size: 11px; }
    .generate-button:hover:not([disabled]) { background: #272727; }
    .generate-button mat-icon { width: 16px; height: 16px; margin-right: 5px; font-size: 16px; }
    .generate-button mat-icon.is-loading { animation: composer-spin 900ms linear infinite; }
    .progress-wrap { display: grid; gap: 5px; padding: 4px 0 0 28px; color: var(--muted); font-size: 10px; }
    .error-box { display: flex; align-items: center; gap: 7px; margin-top: 8px; border-top: 1px solid var(--line); padding: 8px 0 0 28px; color: var(--muted); font-size: 10px; line-height: 1.35; }
    .error-box > mat-icon { width: 16px; height: 16px; flex: 0 0 auto; color: var(--ink); font-size: 16px; }
    .error-box span { min-width: 0; flex: 1; }
    .error-box strong { color: var(--ink); font-weight: 120; }
    .error-box button { width: 30px; height: 30px; flex: 0 0 auto; color: var(--ink); }
    .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; }
    @keyframes composer-spin { to { transform: rotate(360deg); } }
    @media (max-width: 600px) {
      .prompt-count { display: none; }
      .generate-button { width: 38px; padding: 0; }
      .generate-button mat-icon { margin: 0; }
      .generate-button span { display: none; }
    }
  `]
})
export class AiGenerationPanelComponent implements OnDestroy {
  @Output() readonly imageGenerated = new EventEmitter<AiImageResult>();

  readonly state$ = this.stateService.state$;
  private readonly stateSubscription: Subscription;
  private lastEmittedImageId: string | null;

  constructor(readonly stateService: AiStateService) {
    this.lastEmittedImageId = this.stateService.snapshot.generatedImages[0]?.id ?? null;
    this.stateSubscription = this.state$.subscribe((state) => {
      const newestImage = state.generatedImages[0];
      if (!newestImage || newestImage.id === this.lastEmittedImageId) return;
      this.lastEmittedImageId = newestImage.id;
      this.imageGenerated.emit(newestImage);
    });
  }

  ngOnDestroy(): void {
    this.stateSubscription.unsubscribe();
  }

  progressLabel(stage: string): string {
    const labels: Record<string, string> = { preparing: 'Preparing', generating: 'Generating', processing: 'Processing', complete: 'Complete' };
    return labels[stage] ?? 'Ready';
  }

  submitPrompt(event: Event): void {
    event.preventDefault();
    this.stateService.generate();
  }
}
