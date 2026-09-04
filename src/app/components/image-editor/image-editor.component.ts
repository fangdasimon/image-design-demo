import { AfterViewInit, Component, ElementRef, EventEmitter, OnDestroy, Output, ViewChild } from '@angular/core';
import ImageEditor from 'tui-image-editor';
import { DEMO_ART_DATA_URL } from '../../core/demo-art';
import { ToolAction } from '../toolbar/toolbar.component';

const CREATION_THEME = {
  'common.bi.image': 'none',
  'common.bisize.width': '0px',
  'common.bisize.height': '0px',
  'common.backgroundImage': 'none',
  'common.backgroundColor': '#ffffff',
  'common.border': '0px',
  'header.backgroundImage': 'none',
  'header.backgroundColor': 'transparent',
  'header.border': '0px',
  'loadButton.backgroundColor': '#ffffff',
  'loadButton.border': '1px solid #d8d8d4',
  'loadButton.color': '#111111',
  'loadButton.fontFamily': 'Arial, sans-serif',
  'loadButton.fontSize': '11px',
  'downloadButton.backgroundColor': '#111111',
  'downloadButton.border': '1px solid #111111',
  'downloadButton.color': '#ffffff',
  'downloadButton.fontFamily': 'Arial, sans-serif',
  'downloadButton.fontSize': '11px',
  'menu.normalIcon.color': '#8d8d88',
  'menu.activeIcon.color': '#ffffff',
  'menu.disabledIcon.color': '#c8c8c3',
  'menu.hoverIcon.color': '#111111',
  'submenu.normalIcon.color': '#8d8d88',
  'submenu.activeIcon.color': '#111111',
  'menu.iconSize.width': '22px',
  'menu.iconSize.height': '22px',
  'submenu.iconSize.width': '28px',
  'submenu.iconSize.height': '28px',
  'submenu.backgroundColor': '#ffffff',
  'submenu.partition.color': '#deded9',
  'submenu.normalLabel.color': '#74746e',
  'submenu.normalLabel.fontWeight': 'normal',
  'submenu.activeLabel.color': '#111111',
  'submenu.activeLabel.fontWeight': 'bold',
  'checkbox.border': '1px solid #111111',
  'checkbox.backgroundColor': '#ffffff',
  'range.pointer.color': '#111111',
  'range.bar.color': '#c9c9c4',
  'range.subbar.color': '#111111',
  'range.disabledPointer.color': '#bdbdb8',
  'range.disabledBar.color': '#eeeeeb',
  'range.disabledSubbar.color': '#c9c9c4',
  'range.value.color': '#111111',
  'range.value.fontWeight': 'normal',
  'range.value.fontSize': '11px',
  'range.value.border': '1px solid #d8d8d4',
  'range.value.backgroundColor': '#ffffff',
  'range.title.color': '#111111',
  'range.title.fontWeight': 'normal',
  'colorpicker.button.border': '1px solid #d8d8d4',
  'colorpicker.title.color': '#111111'
};

@Component({
  selector: 'app-image-editor',
  standalone: true,
  template: `
    <div class="editor-frame creation-editor" [class.has-image]="imageReady">
      <div #editorHost class="editor-host" aria-label="Image editing canvas"></div>
      @if (!imageReady) {
        <div class="canvas-empty"><span class="empty-index">01</span><strong>Drop an image here</strong><span>or use Upload image to begin</span></div>
      }
      <div class="canvas-corners corner-tl"></div><div class="canvas-corners corner-tr"></div><div class="canvas-corners corner-bl"></div><div class="canvas-corners corner-br"></div>
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; height: 100%; }
    .editor-frame { position: relative; display: grid; width: 100%; height: 100%; min-height: 0; place-items: center; overflow: hidden; background: var(--paper); }
    .editor-host { width: 100%; height: 100%; }
    .canvas-empty { position: absolute; display: grid; justify-items: center; gap: 9px; color: var(--muted); pointer-events: none; text-align: center; }
    .canvas-empty strong { color: var(--ink); font-size: 16px; font-weight: 120; }
    .canvas-empty span:last-child { font-size: 11px; }
    .empty-index { color: var(--ink); font-size: 11px; font-weight: 120; }
    .has-image .canvas-empty { display: none; }
    .canvas-corners { position: absolute; width: 22px; height: 22px; border-color: var(--ink); pointer-events: none; }
    .corner-tl { top: 18px; left: 18px; border-top: 2px solid; border-left: 2px solid; }
    .corner-tr { top: 18px; right: 18px; border-top: 2px solid; border-right: 2px solid; }
    .corner-bl { bottom: 18px; left: 18px; border-bottom: 2px solid; border-left: 2px solid; }
    .corner-br { right: 18px; bottom: 18px; border-right: 2px solid; border-bottom: 2px solid; }
    @media (max-width: 767px) { .editor-frame { min-height: 0; } .canvas-corners { width: 15px; height: 15px; } }
  `]
})
export class ImageEditorComponent implements AfterViewInit, OnDestroy {
  @ViewChild('editorHost', { static: true }) private readonly editorHost!: ElementRef<HTMLDivElement>;
  @Output() readonly ready = new EventEmitter<void>();
  @Output() readonly statusChange = new EventEmitter<string>();
  @Output() readonly filterChange = new EventEmitter<boolean>();

  private editor: any;
  private canvasPanCleanup?: () => void;
  private helpMenuCleanup?: () => void;
  private resizeMenuCleanup?: () => void;
  private cropMenuCleanup?: () => void;
  private resizeActions?: any;
  private nativeResizeActions?: any;
  private resizeSession?: {
    target: any;
    objectId: number;
    originalScaleX: number;
    originalScaleY: number;
  };
  private selectedObject: any | null = null;
  private skipResizeReset = false;
  private workspaceResizeObserver?: ResizeObserver;
  private workspaceCanvasExpanded = false;
  private workspaceZoomBase = 1;
  private cropActive = false;
  private grayscaleActive = false;
  imageReady = false;

  ngAfterViewInit(): void {
    this.editor = new ImageEditor(this.editorHost.nativeElement, {
      cssMaxWidth: 1200,
      cssMaxHeight: 700,
      includeUI: {
        theme: CREATION_THEME,
        menu: ['resize', 'crop', 'flip', 'rotate', 'draw', 'shape', 'icon', 'text', 'mask', 'filter'],
        menuBarPosition: 'left',
        uiSize: { width: '100%', height: '100%' }
      },
      usageStatistics: false,
      selectionStyle: {
        cornerStyle: 'circle',
        cornerSize: 12,
        rotatingPointOffset: 28,
        cornerColor: '#f28c28',
        cornerStrokeColor: '#ffffff',
        borderColor: '#f28c28',
        lineWidth: 2,
        transparentCorners: false
      }
    });
    this.attachSelectionEvents();
    this.attachCanvasPan();
    this.attachHelpMenuActions();
    this.observeWorkspaceResize();
    void this.loadImageFromUrl(DEMO_ART_DATA_URL, 'Creation study');
  }

  ngOnDestroy(): void {
    this.canvasPanCleanup?.();
    this.helpMenuCleanup?.();
    this.resizeMenuCleanup?.();
    this.cropMenuCleanup?.();
    this.workspaceResizeObserver?.disconnect();
    this.editor?.destroy();
  }

  private attachSelectionEvents(): void {
    this.editor.on('objectActivated', (objectProps: any) => {
      if (objectProps?.type === 'cropzone' || objectProps?.type === 'activeSelection') return;

      const activeObject = this.editor._graphics?.getActiveObject?.();
      if (!activeObject) return;

      this.selectedObject = activeObject;
      if (this.editor.ui?.submenu === 'resize') {
        this.beginResizeSession(activeObject);
        this.syncResizePanel();
      }
    });
    this.editor.on('selectionCleared', () => {
      const resizeMenuOpen = this.editor.ui?.submenu === 'resize';
      if (resizeMenuOpen && this.resizeSession) {
        this.restoreResizeSession();
        this.resizeSession = undefined;
      }
      this.selectedObject = null;
      if (resizeMenuOpen) this.syncResizePanel();
    });
  }

  private attachResizeBehavior(): void {
    const resizeActions = this.editor.ui?._actions?.resize;
    const resizeButton = this.editor.ui?._buttonElements?.resize as HTMLElement | undefined;
    if (!resizeActions || !resizeButton || this.resizeActions) return;

    this.resizeActions = resizeActions;
    this.nativeResizeActions = {
      getCurrentDimensions: resizeActions.getCurrentDimensions,
      preview: resizeActions.preview,
      lockAspectRatio: resizeActions.lockAspectRatio,
      resize: resizeActions.resize,
      reset: resizeActions.reset,
    };
    resizeActions.getCurrentDimensions = () => this.getResizeDimensions();
    resizeActions.preview = (actor: 'width' | 'height', value: number, lockState: boolean) => {
      this.previewResize(actor, value, lockState);
    };
    resizeActions.lockAspectRatio = (lockState: boolean, min: number, max: number) => {
      this.updateResizeLimits(lockState, min, max);
    };
    resizeActions.resize = () => {
      void this.commitResize();
    };
    resizeActions.reset = (standByMode = false) => {
      this.resetResize(standByMode);
    };

    const onResizeMenuClick = (event: MouseEvent): void => {
      event.preventDefault();
      event.stopImmediatePropagation();

      const isOpen = this.editor.ui?.submenu === 'resize';
      if (!isOpen) this.beginResizeSession(this.getActiveObject());
      this.editor.ui.changeMenu('resize', true, false);
      if (!isOpen) this.syncResizePanel();
    };
    resizeButton.addEventListener('click', onResizeMenuClick, true);
    this.resizeMenuCleanup = () => resizeButton.removeEventListener('click', onResizeMenuClick, true);
  }

  private attachCropBehavior(): void {
    const cropButton = this.editor.ui?._buttonElements?.crop as HTMLElement | undefined;
    if (!cropButton || this.cropMenuCleanup) return;

    const onCropMenuClick = (): void => {
      // TUI switches drawing mode in its own click handler. Keep the crop
      // surface unselected until the user draws a crop region.
      window.setTimeout(() => {
        this.cropActive = this.editor.getDrawingMode?.() === 'CROPPER';
      });
    };

    cropButton.addEventListener('click', onCropMenuClick);
    this.cropMenuCleanup = () => cropButton.removeEventListener('click', onCropMenuClick);
  }

  private getActiveObject(): any | null {
    const activeObject = this.editor._graphics?.getActiveObject?.();
    if (!activeObject || activeObject.type === 'activeSelection' || activeObject.type === 'cropzone') return null;
    return activeObject;
  }

  private beginResizeSession(target: any | null): void {
    if (!target) {
      this.resizeSession = undefined;
      return;
    }

    const objectId = Number(this.editor._graphics?.getObjectId?.(target));
    if (!Number.isFinite(objectId)) return;
    if (this.resizeSession?.target === target) return;

    if (this.resizeSession) this.restoreResizeSession();
    this.resizeSession = {
      target,
      objectId,
      originalScaleX: Number(target.scaleX) || 1,
      originalScaleY: Number(target.scaleY) || 1,
    };
  }

  private getResizeTarget(): any | null {
    const activeObject = this.getActiveObject();
    if (!activeObject) return null;
    if (!this.resizeSession || this.resizeSession.target !== activeObject) {
      this.beginResizeSession(activeObject);
    }
    return activeObject;
  }

  private getResizeDimensions(): { width: number; height: number } {
    const target = this.getResizeTarget();
    if (!target) return this.nativeResizeActions.getCurrentDimensions();

    return {
      width: this.getScaledObjectDimension(target, 'width', 'scaleX'),
      height: this.getScaledObjectDimension(target, 'height', 'scaleY'),
    };
  }

  private getScaledObjectDimension(target: any, dimension: 'width' | 'height', scale: 'scaleX' | 'scaleY'): number {
    const baseDimension = Number(target[dimension]) || 1;
    const scaleValue = Number(target[scale]) || 1;
    return Math.max(1, Math.round(Math.abs(baseDimension * scaleValue)));
  }

  private previewResize(actor: 'width' | 'height', value: number, lockState: boolean): void {
    const target = this.getResizeTarget();
    if (!target) {
      this.nativeResizeActions.preview(actor, value, lockState);
      return;
    }

    const currentDimensions = this.getResizeDimensions();
    const aspectRatio = currentDimensions.width / currentDimensions.height;
    const dimensions = actor === 'width'
      ? { width: Math.max(1, Math.round(value)), height: lockState ? Math.max(1, Math.round(value / aspectRatio)) : currentDimensions.height }
      : { width: lockState ? Math.max(1, Math.round(value * aspectRatio)) : currentDimensions.width, height: Math.max(1, Math.round(value)) };
    const baseWidth = Number(target.width) || 1;
    const baseHeight = Number(target.height) || 1;
    const signX = Math.sign(Number(target.scaleX) || 1);
    const signY = Math.sign(Number(target.scaleY) || 1);

    this.editor.setObjectPropertiesQuietly(this.resizeSession!.objectId, {
      scaleX: signX * (dimensions.width / baseWidth),
      scaleY: signY * (dimensions.height / baseHeight),
    });
    this.editor.ui.resize.setWidthValue(dimensions.width);
    this.editor.ui.resize.setHeightValue(dimensions.height);
  }

  private updateResizeLimits(lockState: boolean, min: number, max: number): void {
    const target = this.getResizeTarget();
    if (!target) {
      this.nativeResizeActions.lockAspectRatio(lockState, min, max);
      return;
    }

    if (!lockState) {
      this.editor.ui.resize.setLimit({ minWidth: min, minHeight: min, maxWidth: max, maxHeight: max });
      return;
    }

    const { width, height } = this.getResizeDimensions();
    const aspectRatio = width / height;
    if (width > height) {
      this.editor.ui.resize.setLimit({
        minWidth: Math.max(min, min * aspectRatio),
        minHeight: min,
        maxWidth: max,
        maxHeight: Math.min(max, max / aspectRatio),
      });
    } else {
      this.editor.ui.resize.setLimit({
        minWidth: min,
        minHeight: Math.max(min, min / aspectRatio),
        maxWidth: Math.min(max, max * aspectRatio),
        maxHeight: max,
      });
    }
  }

  private restoreResizeSession(): void {
    if (!this.resizeSession) return;
    this.editor.setObjectPropertiesQuietly(this.resizeSession.objectId, {
      scaleX: this.resizeSession.originalScaleX,
      scaleY: this.resizeSession.originalScaleY,
    });
  }

  private resetResize(standByMode = false): void {
    if (this.skipResizeReset) {
      this.skipResizeReset = false;
      return;
    }

    if (!this.resizeSession) {
      this.nativeResizeActions.reset(standByMode);
      return;
    }

    this.restoreResizeSession();
    this.resizeSession = undefined;
    if (!standByMode) {
      this.skipResizeReset = true;
      this.editor.ui.changeMenu('resize', true, false);
    }
  }

  private async commitResize(): Promise<void> {
    const target = this.getResizeTarget();
    if (!target || !this.resizeSession) {
      this.nativeResizeActions.resize();
      return;
    }

    const currentDimensions = this.getResizeDimensions();
    const baseWidth = Number(target.width) || 1;
    const baseHeight = Number(target.height) || 1;
    const signX = Math.sign(Number(target.scaleX) || 1);
    const signY = Math.sign(Number(target.scaleY) || 1);
    const finalScaleX = signX * (currentDimensions.width / baseWidth);
    const finalScaleY = signY * (currentDimensions.height / baseHeight);
    const session = this.resizeSession;

    this.editor.setObjectPropertiesQuietly(session.objectId, {
      scaleX: session.originalScaleX,
      scaleY: session.originalScaleY,
    });
    await this.editor.setObjectProperties(session.objectId, { scaleX: finalScaleX, scaleY: finalScaleY });
    this.resizeSession = undefined;
    this.editor.ui.resize.changeApplyButtonStatus(false);
    this.skipResizeReset = true;
    this.editor.ui.changeMenu('resize', true, false);
    this.statusChange.emit('Image resized.');
  }

  private syncResizePanel(): void {
    if (this.editor.ui?.submenu !== 'resize' || !this.editor.ui.resize) return;
    const dimensions = this.getResizeDimensions();
    this.editor.ui.resize.setWidthValue(dimensions.width);
    this.editor.ui.resize.setHeightValue(dimensions.height);
    this.updateResizePanelHint();
    const lockInput = this.editorHost.nativeElement.querySelector<HTMLInputElement>('.tie-lock-aspect-ratio');
    if (lockInput) lockInput.checked = false;
    this.editor.ui.resize._lockState = false;
    this.editor.ui.resize.setLimit({ minWidth: 32, minHeight: 32, maxWidth: 4088, maxHeight: 4088 });
  }

  private updateResizePanelHint(): void {
    const resizePanel = Array.from(
      this.editorHost.nativeElement.querySelectorAll<HTMLElement>('.tui-image-editor-submenu > .tui-image-editor-menu-resize')
    ).find((panel) => getComputedStyle(panel).display !== 'none');
    const submenuItem = resizePanel?.querySelector<HTMLElement>(':scope > .tui-image-editor-submenu-item');
    if (!submenuItem) return;

    let hint = submenuItem.querySelector<HTMLLIElement>(':scope > .creation-resize-hint');
    if (!hint) {
      hint = document.createElement('li');
      hint.className = 'creation-resize-hint';
      const title = document.createElement('strong');
      const description = document.createElement('span');
      hint.append(title, description);
      submenuItem.prepend(hint);
    }

    const hasSelectedImage = Boolean(this.getActiveObject());
    const title = hint.querySelector('strong');
    const description = hint.querySelector('span');
    if (title) title.textContent = hasSelectedImage ? 'Image size' : 'Canvas size';
    if (description) description.textContent = hasSelectedImage
      ? 'Width and height control the selected image.'
      : 'Width and height control the canvas.';
  }

  private async makeLoadedImageSelectable(url: string): Promise<void> {
    const canvas = this.editor?._graphics?.getCanvas?.();
    const canvasImage = this.editor?._graphics?.getCanvasImage?.();
    if (!canvas || !canvasImage) return;

    const objectProps = await this.editor.addImageObject(url);
    if (objectProps?.id == null) return;

    const objectWidth = Number(objectProps.width) || 1;
    const objectHeight = Number(objectProps.height) || 1;
    const imageWidth = Number(canvasImage.width) * (Number(canvasImage.scaleX) || 1);
    const imageHeight = Number(canvasImage.height) * (Number(canvasImage.scaleY) || 1);
    await this.editor.setObjectProperties(objectProps.id, {
      scaleX: imageWidth / objectWidth,
      scaleY: imageHeight / objectHeight,
    });

    // Keep TUI's canvas-size source for the no-selection resize path, while
    // displaying the matching Fabric object as the selectable image layer.
    canvasImage.set({ opacity: 0 });
    canvas.renderAll();
    this.editor.discardSelection();
  }

  private observeWorkspaceResize(): void {
    const workspace = this.editorHost.nativeElement.querySelector<HTMLElement>('.tui-image-editor-main-container');
    if (!workspace || typeof ResizeObserver === 'undefined') return;
    this.workspaceResizeObserver = new ResizeObserver(() => this.expandCanvasToWorkspace());
    this.workspaceResizeObserver.observe(workspace);
  }

  private expandCanvasToWorkspace(): void {
    const canvas = this.editor?._graphics?.getCanvas?.();
    const image = canvas?.backgroundImage;
    const workspace = this.editorHost.nativeElement.querySelector<HTMLElement>('.tui-image-editor-main-container');
    if (!canvas || !image?.width || !image?.height || !workspace) return;

    const bounds = workspace.getBoundingClientRect();
    const width = Math.max(1, Math.round(bounds.width));
    const height = Math.max(1, Math.round(bounds.height));
    const graphics = this.editor._graphics;
    const maxWidth = Number(graphics.cssMaxWidth) || image.width;
    const maxHeight = Number(graphics.cssMaxHeight) || image.height;
    const currentZoom = this.workspaceCanvasExpanded ? Number(canvas.getZoom?.()) || 1 : 1;
    this.workspaceZoomBase = Math.min(maxWidth / image.width, maxHeight / image.height, width / image.width, height / image.height);
    const contentScale = Math.min(currentZoom, this.workspaceZoomBase);

    canvas.setDimensions({ width, height });
    canvas.setDimensions({ width, height }, { cssOnly: true });
    canvas.setViewportTransform([
      contentScale,
      0,
      0,
      contentScale,
      (width - image.width * contentScale) / 2,
      (height - image.height * contentScale) / 2
    ]);
    canvas.calcOffset?.();
    canvas.requestRenderAll?.();
    this.workspaceCanvasExpanded = true;
  }

  private attachHelpMenuActions(): void {
    const helpMenu = this.editorHost.nativeElement.querySelector<HTMLElement>('.tui-image-editor-help-menu');
    if (!helpMenu) return;

    const onHelpMenuClick = (event: MouseEvent): void => {
      const target = event.target instanceof Element
        ? event.target.closest<HTMLElement>('.tie-btn-zoomIn, .tie-btn-zoomOut, .tie-btn-delete, .tie-btn-deleteAll')
        : null;
      if (!target) return;

      const canvas = this.editor?._graphics?.getCanvas?.();
      if (target.classList.contains('tie-btn-delete') && !canvas?.getActiveObject?.()) {
        event.preventDefault();
        event.stopImmediatePropagation();
        this.statusChange.emit('Select an image or object before deleting.');
        return;
      }
      if (target.classList.contains('tie-btn-deleteAll') && !canvas?.getObjects?.().length) {
        event.preventDefault();
        event.stopImmediatePropagation();
        this.statusChange.emit('There are no editable objects to delete.');
        return;
      }

      if (!target.classList.contains('tie-btn-zoomIn') && !target.classList.contains('tie-btn-zoomOut')) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      this.zoomCanvas(target.classList.contains('tie-btn-zoomIn') ? 1.25 : 0.8);
    };

    helpMenu.addEventListener('click', onHelpMenuClick, true);
    this.helpMenuCleanup = () => helpMenu.removeEventListener('click', onHelpMenuClick, true);
  }

  private zoomCanvas(factor: number): void {
    const canvas = this.editor?._graphics?.getCanvas?.();
    if (!canvas) return;

    const currentZoom = Number(canvas.getZoom?.()) || this.workspaceZoomBase;
    const minimumZoom = this.workspaceZoomBase * 0.5;
    const nextZoom = factor > 1
      ? Math.min(5, currentZoom * factor)
      : Math.max(minimumZoom, currentZoom * factor);
    if (Math.abs(nextZoom - currentZoom) < 0.001) return;

    canvas.zoomToPoint({ x: canvas.getWidth() / 2, y: canvas.getHeight() / 2 }, nextZoom);
    canvas.calcOffset?.();
    canvas.requestRenderAll?.();
    this.statusChange.emit(`Zoom ${Math.round((nextZoom / this.workspaceZoomBase) * 100)}%.`);
  }

  private attachCanvasPan(): void {
    const canvas = this.editor?._graphics?.getCanvas?.();
    const workspace = this.editorHost.nativeElement.querySelector<HTMLElement>('.tui-image-editor-main-container');
    if (!canvas || !workspace) return;

    let isPanning = false;
    let previousPoint = { x: 0, y: 0 };
    const canvasContainerSelector = '.tui-image-editor-canvas-container';
    const chromeSelector = '.tui-image-editor-controls, .tui-image-editor-help-menu, .tui-image-editor-submenu';

    const panViewport = (deltaX: number, deltaY: number): void => {
      if (!canvas.viewportTransform) return;
      canvas.viewportTransform[4] += deltaX;
      canvas.viewportTransform[5] += deltaY;
      canvas.requestRenderAll?.();
    };
    const isCanvasInteractionModeActive = (): boolean => {
      const drawingMode = this.editor.getDrawingMode?.() ?? this.editor._graphics?.getDrawingMode?.();
      return ['CROPPER', 'FREE_DRAWING', 'LINE_DRAWING', 'SHAPE', 'TEXT', 'ICON', 'ZOOM'].includes(drawingMode);
    };

    canvas.defaultCursor = 'grab';

    canvas.on('mouse:down', (event: any) => {
      if (isCanvasInteractionModeActive() || event.target || this.editor._graphics?.getZoomMode?.() === 'zoom' || !event.e) return;
      isPanning = true;
      previousPoint = { x: event.e.clientX, y: event.e.clientY };
      canvas.defaultCursor = 'grabbing';
    });
    canvas.on('mouse:move', (event: any) => {
      if (isCanvasInteractionModeActive()) {
        isPanning = false;
        return;
      }
      if (!isPanning || !event.e || !canvas.viewportTransform) return;
      const nextPoint = { x: event.e.clientX, y: event.e.clientY };
      panViewport(nextPoint.x - previousPoint.x, nextPoint.y - previousPoint.y);
      previousPoint = nextPoint;
    });
    canvas.on('mouse:up', () => {
      isPanning = false;
      canvas.defaultCursor = 'grab';
    });

    const onWorkspacePointerDown = (event: PointerEvent): void => {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest(chromeSelector) || target?.closest(canvasContainerSelector)) return;
      isPanning = true;
      previousPoint = { x: event.clientX, y: event.clientY };
      workspace.setPointerCapture?.(event.pointerId);
      workspace.style.cursor = 'grabbing';
      event.preventDefault();
    };
    const onWorkspacePointerMove = (event: PointerEvent): void => {
      if (!isPanning) return;
      panViewport(event.clientX - previousPoint.x, event.clientY - previousPoint.y);
      previousPoint = { x: event.clientX, y: event.clientY };
      event.preventDefault();
    };
    const stopWorkspacePan = (event: PointerEvent): void => {
      if (!isPanning) return;
      isPanning = false;
      workspace.releasePointerCapture?.(event.pointerId);
      workspace.style.cursor = '';
    };

    workspace.addEventListener('pointerdown', onWorkspacePointerDown);
    workspace.addEventListener('pointermove', onWorkspacePointerMove);
    workspace.addEventListener('pointerup', stopWorkspacePan);
    workspace.addEventListener('pointercancel', stopWorkspacePan);
    this.canvasPanCleanup = () => {
      workspace.removeEventListener('pointerdown', onWorkspacePointerDown);
      workspace.removeEventListener('pointermove', onWorkspacePointerMove);
      workspace.removeEventListener('pointerup', stopWorkspacePan);
      workspace.removeEventListener('pointercancel', stopWorkspacePan);
    };
  }

  async handleAction(action: ToolAction): Promise<void> {
    if (!this.editor) return;
    try {
      switch (action) {
        case 'undo':
          await this.editor.undo();
          this.syncFilterState();
          this.statusChange.emit('Last edit undone.');
          break;
        case 'redo':
          await this.editor.redo();
          this.syncFilterState();
          this.statusChange.emit('Edit restored.');
          break;
        case 'rotate':
          await this.editor.rotate(90);
          this.statusChange.emit('Rotated 90 degrees.');
          break;
        case 'text':
          await this.editor.addText('New text', { styles: { fill: '#000000', fontSize: 36, fontWeight: '600' } });
          this.statusChange.emit('Text added to canvas.');
          break;
        case 'filter':
          await this.toggleGrayscale();
          break;
        case 'crop':
          if (!this.cropActive) {
            this.cropActive = this.editor.startDrawingMode('CROPPER');
            this.statusChange.emit(this.cropActive ? 'Crop area active. Choose a region, then select Crop again to apply.' : 'Crop mode is unavailable.');
          } else {
            await this.editor.crop(this.editor.getCropzoneRect());
            this.editor.stopDrawingMode();
            this.cropActive = false;
            this.statusChange.emit('Crop applied.');
          }
          break;
        case 'select':
          if (this.cropActive) {
            this.editor.stopDrawingMode();
            this.cropActive = false;
          }
          this.statusChange.emit('Select an object on the canvas.');
          break;
        default: break;
      }
    } catch {
      this.statusChange.emit('This edit could not be applied. Try another tool.');
    }
  }

  async loadLocalImage(file: File): Promise<void> {
    if (!file.type.startsWith('image/')) {
      this.statusChange.emit('Please choose an image file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => void this.addImageObjectToCanvas(String(reader.result), 'Image added to canvas.');
    reader.onerror = () => this.statusChange.emit('The image could not be read.');
    reader.readAsDataURL(file);
  }

  async addImageToCanvas(dataUrl: string): Promise<void> {
    await this.addImageObjectToCanvas(dataUrl, 'AI image added to canvas.');
  }

  private async addImageObjectToCanvas(dataUrl: string, successMessage: string): Promise<void> {
    if (!this.editor) return;
    try {
      if (this.cropActive) {
        this.editor.stopDrawingMode();
        this.cropActive = false;
      }
      const objectProps = await this.editor.addImageObject(dataUrl);
      const canvasImage = this.editor._graphics?.getCanvasImage?.();
      const canvasSize = canvasImage ? { width: canvasImage.width, height: canvasImage.height } : this.editor.getCanvasSize();
      const imageWidth = Number(objectProps?.width) || 0;
      const imageHeight = Number(objectProps?.height) || 0;
      const maxDimension = Math.min(canvasSize.width, canvasSize.height) * 0.72;
      const scale = imageWidth && imageHeight ? Math.min(1, maxDimension / imageWidth, maxDimension / imageHeight) : 1;
      if (scale < 1 && objectProps?.id != null) {
        await this.editor.setObjectProperties(objectProps.id, { scaleX: scale, scaleY: scale });
      }
      this.imageReady = true;
      this.statusChange.emit(successMessage);
    } catch {
      this.statusChange.emit('The image could not be added to canvas.');
    }
  }

  async reset(): Promise<void> {
    this.grayscaleActive = false;
    this.filterChange.emit(false);
    await this.loadImageFromUrl(DEMO_ART_DATA_URL, 'Creation study');
  }

  async exportImage(): Promise<void> {
    if (!this.editor) return;
    const cropRect = this.editor.getDrawingMode?.() === 'CROPPER'
      ? this.editor.getCropzoneRect?.()
      : null;
    const hasCropSelection = Boolean(cropRect && cropRect.width > 1 && cropRect.height > 1);
    const dataUrl = hasCropSelection
      ? this.editor.toDataURL({ format: 'png', quality: 0.95, ...cropRect })
      : this.editor.toDataURL({ format: 'png', quality: 0.95 });
    const anchor = document.createElement('a');
    anchor.href = dataUrl;
    anchor.download = 'creation-studio-export.png';
    anchor.click();
    this.statusChange.emit(hasCropSelection ? 'Crop selection exported.' : 'Image exported.');
  }

  private async loadImageFromUrl(url: string, name: string): Promise<void> {
    if (!this.editor) return;
    try {
      await this.editor.loadImageFromURL(url, name);
      this.editor.ui?.activeMenuEvent?.();
      this.attachResizeBehavior();
      this.attachCropBehavior();
      if (this.editor.ui) this.editor.ui.initializeImgUrl = url;
      await this.makeLoadedImageSelectable(url);
      this.expandCanvasToWorkspace();
      this.editor.clearUndoStack?.();
      this.editor.clearRedoStack?.();
      this.editor.ui?.clearHistory?.();
      this.grayscaleActive = false;
      this.filterChange.emit(false);
      this.imageReady = true;
      this.ready.emit();
    } catch {
      this.statusChange.emit('The image could not be loaded.');
    }
  }

  private async toggleGrayscale(): Promise<void> {
    const shouldApply = !this.editor.hasFilter('Grayscale');
    if (shouldApply) {
      await this.editor.applyFilter('Grayscale');
    } else {
      await this.editor.removeFilter('Grayscale');
    }
    this.grayscaleActive = shouldApply;
    this.filterChange.emit(shouldApply);
    this.statusChange.emit(shouldApply ? 'Grayscale applied.' : 'Grayscale removed.');
  }

  private syncFilterState(): void {
    this.grayscaleActive = Boolean(this.editor.hasFilter('Grayscale'));
    this.filterChange.emit(this.grayscaleActive);
  }
}
