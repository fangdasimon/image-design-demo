import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

export type ToolAction = 'select' | 'crop' | 'text' | 'filter' | 'rotate' | 'undo' | 'redo' | 'upload';

interface ToolItem {
  action: ToolAction;
  icon: string;
  label: string;
}

@Component({
  selector: 'app-toolbar',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatTooltipModule],
  template: `
    <div class="toolbar-heading">
      <span class="section-label">Edit</span>
      <span class="tool-count">{{ tools.length | number: '2.0-0' }}</span>
    </div>
    <div class="tool-list" role="toolbar" aria-label="Image editor tools">
      @for (tool of tools; track tool.action) {
        <button
          mat-icon-button
          class="tool-button"
          [class.is-active]="activeTool === tool.action"
          [attr.aria-pressed]="activeTool === tool.action"
          [attr.aria-label]="tool.label"
          [matTooltip]="tool.label"
          (click)="onAction(tool.action)"
        >
          <mat-icon fontSet="material-symbols-outlined">{{ tool.icon }}</mat-icon>
          <span class="tool-label">{{ tool.label }}</span>
        </button>
      }
    </div>
    <div class="toolbar-divider"></div>
    <button mat-icon-button class="upload-button" aria-label="Upload image" matTooltip="Upload image" (click)="fileInput.click()">
      <mat-icon fontSet="material-symbols-outlined">upload</mat-icon>
      <span>Upload</span>
    </button>
    <input #fileInput type="file" accept="image/*" hidden (change)="onFileSelected($event)" />
  `,
  styles: [`
    :host { display: flex; flex-direction: column; height: 100%; }
    .toolbar-heading { display: flex; align-items: center; justify-content: space-between; padding: 5px 4px 13px; }
    .section-label { color: var(--ink); font-size: 12px; font-weight: 120; letter-spacing: 0; }
    .tool-count { color: var(--muted); font-size: 10px; }
    .tool-list { display: grid; gap: 4px; }
    .tool-button { width: 100%; min-height: 58px; height: auto; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; padding: 7px 3px; border-radius: 0; color: var(--muted); }
    .tool-button mat-icon { width: 21px; height: 21px; font-size: 21px; }
    .tool-label { font-size: 10px; font-weight: 80; line-height: 1.1; text-align: center; }
    .tool-button:hover, .tool-button:focus-visible, .tool-button.is-active { background: var(--ink); color: var(--paper); }
    .tool-button:hover .tool-label, .tool-button:focus-visible .tool-label { font-variation-settings: 'wght' 120, 'slnt' 12; }
    .toolbar-divider { height: 1px; background: var(--line); margin: 14px 0; }
    .upload-button { width: 100%; min-height: 52px; height: auto; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; border: 1px solid var(--line); border-radius: 0; color: var(--ink); font-size: 10px; }
    .upload-button mat-icon { width: 20px; height: 20px; font-size: 20px; }
    .upload-button:hover { background: var(--primary-grey); }
    @media (max-width: 767px) { .toolbar-heading { padding-top: 0; } .tool-list { grid-template-columns: repeat(4, 1fr); } .tool-button { min-height: 48px; display: flex; flex-direction: column; gap: 2px; justify-content: center; align-items: center; padding: 5px; } .tool-label { font-size: 10px; } .upload-button { width: 100%; } }
  `]
})
export class ToolbarComponent {
  @Input() activeTool: ToolAction = 'select';
  @Output() readonly action = new EventEmitter<ToolAction>();
  @Output() readonly imageSelected = new EventEmitter<File>();

  readonly tools: ToolItem[] = [
    { action: 'select', icon: 'near_me', label: 'Select' },
    { action: 'crop', icon: 'crop', label: 'Crop' },
    { action: 'text', icon: 'title', label: 'Add text' },
    { action: 'filter', icon: 'tonality', label: 'Grayscale' },
    { action: 'rotate', icon: 'rotate_right', label: 'Rotate' },
    { action: 'undo', icon: 'undo', label: 'Undo' },
    { action: 'redo', icon: 'redo', label: 'Redo' }
  ];
  onAction(action: ToolAction): void {
    this.activeTool = action;
    this.action.emit(action);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.imageSelected.emit(file);
      input.value = '';
    }
  }
}
