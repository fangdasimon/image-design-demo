import { CommonModule } from '@angular/common';
import { Component, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AiImageResult } from './core/models/ai.models';
import { AiGenerationPanelComponent } from './components/ai-generation-panel/ai-generation-panel.component';
import { ImageEditorComponent } from './components/image-editor/image-editor.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, AiGenerationPanelComponent, ImageEditorComponent, MatButtonModule, MatIconModule, MatSnackBarModule, MatTooltipModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  @ViewChild(ImageEditorComponent) private readonly imageEditor!: ImageEditorComponent;

  imageReady = false;
  statusMessage = 'Canvas ready';

  constructor(private readonly snackBar: MatSnackBar) {}

  onHistoryAction(action: 'undo' | 'redo'): void {
    void this.imageEditor?.handleAction(action);
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    void this.imageEditor?.loadLocalImage(file);
    input.value = '';
  }

  exportImage(): void {
    void this.imageEditor?.exportImage();
  }

  onAiImage(image: AiImageResult): void {
    void this.imageEditor?.addImageToCanvas(image.dataUrl);
  }

  onStatus(message: string): void {
    this.statusMessage = message;
    this.snackBar.open(message, 'Dismiss', { duration: 2600, horizontalPosition: 'right', verticalPosition: 'bottom' });
  }

}
