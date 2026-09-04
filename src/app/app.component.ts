import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AiImageResult } from './core/models/ai.models';
import { AiGenerationPanelComponent } from './components/ai-generation-panel/ai-generation-panel.component';
import { ImageEditorComponent } from './components/image-editor/image-editor.component';
import { DocumentSaveResult, PersistedDocument, StorageService } from './core/storage.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, AiGenerationPanelComponent, ImageEditorComponent, MatButtonModule, MatIconModule, MatSnackBarModule, MatTooltipModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  @ViewChild(ImageEditorComponent) private readonly imageEditor!: ImageEditorComponent;
  @ViewChild('titleInput') private readonly titleInput?: ElementRef<HTMLInputElement>;

  imageReady = false;
  statusMessage = 'Canvas ready';
  sourceImage: string | null = null;
  canvasTitle = 'Untitled canvas';
  isEditingTitle = false;
  saveStateLabel = 'Preparing local save...';

  private readonly savedDocument: Partial<PersistedDocument>;
  private titleBeforeEdit = '';
  private pendingCanvasJson: string | null = null;
  private documentReady = false;
  private saveTimer?: ReturnType<typeof setTimeout>;

  constructor(private readonly snackBar: MatSnackBar, private readonly storage: StorageService) {
    this.savedDocument = this.storage.readDocument();
    if (this.savedDocument.title?.trim()) {
      this.canvasTitle = this.savedDocument.title.trim();
    }
    this.pendingCanvasJson = this.savedDocument.canvasJson ?? null;
  }

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

  async onEditorReady(): Promise<void> {
    this.imageReady = true;
    const pendingCanvasJson = this.pendingCanvasJson;
    if (!this.hasRestorableCanvas(pendingCanvasJson) || !this.imageEditor) {
      this.pendingCanvasJson = this.imageEditor?.getDocumentSnapshot() ?? null;
      this.documentReady = true;
      this.scheduleDocumentSave();
      return;
    }

    this.saveStateLabel = 'Restoring locally...';
    const restored = await this.imageEditor.restoreDocument(pendingCanvasJson);
    this.documentReady = true;
    if (restored) {
      this.saveStateLabel = 'Autosaved locally';
      return;
    }

    this.pendingCanvasJson = null;
    this.saveStateLabel = 'Saving locally...';
    this.scheduleDocumentSave();
  }

  private hasRestorableCanvas(canvasJson: string | null): canvasJson is string {
    if (!canvasJson) return false;

    try {
      const canvas = JSON.parse(canvasJson) as { objects?: unknown };
      return Array.isArray(canvas.objects) && canvas.objects.length > 0;
    } catch {
      return false;
    }
  }

  onDocumentChange(canvasJson: string): void {
    this.pendingCanvasJson = canvasJson;
    if (this.documentReady) {
      this.scheduleDocumentSave();
    }
  }

  beginTitleEdit(): void {
    if (this.isEditingTitle) return;
    this.titleBeforeEdit = this.canvasTitle;
    this.isEditingTitle = true;
    window.setTimeout(() => {
      const input = this.titleInput?.nativeElement;
      input?.focus();
      input?.select();
    });
  }

  onTitleInput(event: Event): void {
    this.canvasTitle = (event.target as HTMLInputElement).value;
  }

  finishTitleEdit(): void {
    if (!this.isEditingTitle) return;
    const nextTitle = this.canvasTitle.trim();
    this.canvasTitle = nextTitle || this.titleBeforeEdit || 'Untitled canvas';
    this.isEditingTitle = false;
    this.scheduleDocumentSave();
  }

  cancelTitleEdit(): void {
    if (!this.isEditingTitle) return;
    this.canvasTitle = this.titleBeforeEdit || 'Untitled canvas';
    this.isEditingTitle = false;
  }

  onSelectedImageChange(sourceImage: string | null): void {
    this.sourceImage = sourceImage;
  }

  onStatus(message: string): void {
    this.statusMessage = message;
    this.snackBar.open(message, 'Dismiss', { duration: 2600, horizontalPosition: 'right', verticalPosition: 'bottom' });
  }

  private scheduleDocumentSave(): void {
    if (!this.documentReady && !this.pendingCanvasJson) return;
    this.saveStateLabel = 'Saving locally...';
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.persistDocument(), 350);
  }

  private persistDocument(): void {
    this.saveTimer = undefined;
    const saveResult: DocumentSaveResult = this.storage.writeDocument({
      title: this.canvasTitle.trim() || 'Untitled canvas',
      canvasJson: this.pendingCanvasJson
    });
    this.saveStateLabel = saveResult === 'document'
      ? 'Autosaved locally'
      : saveResult === 'title'
        ? 'Title saved locally'
        : 'Local save unavailable';
  }

}
