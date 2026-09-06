import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild } from '@angular/core';
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

const CREATION_SELECTION_STYLE = {
  cornerStyle: 'circle',
  cornerSize: 12,
  rotatingPointOffset: 28,
  cornerColor: '#f28c28',
  cornerStrokeColor: '#ffffff',
  borderColor: '#f28c28',
  lineWidth: 2,
  transparentCorners: false
};

const WORKSPACE_CONTENT_OFFSET_X = 10;
const DOCUMENT_RESTORE_TIMEOUT_MS = 5000;

interface MinimapBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface MinimapMetrics {
  cssWidth: number;
  cssHeight: number;
  pixelWidth: number;
  pixelHeight: number;
  scale: number;
  padX: number;
  padY: number;
}

@Component({
  selector: 'app-image-editor',
  standalone: true,
  template: `
    <div class="editor-frame creation-editor" [class.has-image]="imageReady" [class.crop-active]="cropActive">
      <div #editorHost class="editor-host" aria-label="Image editing canvas"></div>
      <div #cropMask class="crop-mask" aria-hidden="true">
        <span class="crop-mask-full"></span>
        <span class="crop-mask-edge crop-mask-top"></span>
        <span class="crop-mask-edge crop-mask-right"></span>
        <span class="crop-mask-edge crop-mask-bottom"></span>
        <span class="crop-mask-edge crop-mask-left"></span>
      </div>
      @if (!imageReady) {
        <div class="canvas-empty"><span class="empty-index">01</span><strong>Drop an image here</strong><span>or use Upload image to begin</span></div>
      }
      <div class="canvas-corners corner-tl"></div><div class="canvas-corners corner-tr"></div><div class="canvas-corners corner-bl"></div><div class="canvas-corners corner-br"></div>
      @if (experimentalMinimapEnabled) {
        <aside class="canvas-minimap" aria-label="Canvas overview">
          <div class="canvas-minimap-header">
            <strong>Overview</strong>
            <button type="button" class="canvas-minimap-close" aria-label="Hide overview" title="Hide overview" (click)="setExperimentalMinimapEnabled(false)">
              <span class="creation-ui-icon creation-ui-icon--close" aria-hidden="true"></span>
            </button>
          </div>
          <div
            #minimapSurface
            class="canvas-minimap-surface"
            [class.is-dragging]="minimapDragging"
            (pointerdown)="onMinimapPointerDown($event)"
            (pointermove)="onMinimapPointerMove($event)"
            (pointerup)="onMinimapPointerUp($event)"
            (pointercancel)="onMinimapPointerUp($event)"
          >
            <canvas #minimapCanvas class="canvas-minimap-canvas"></canvas>
            <div
              class="canvas-minimap-viewport"
              [class.is-empty]="!minimapReady"
              [style.left.px]="minimapViewport.left"
              [style.top.px]="minimapViewport.top"
              [style.width.px]="minimapViewport.width"
              [style.height.px]="minimapViewport.height"
            ></div>
          </div>
        </aside>
      }
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; height: 100%; }
    .editor-frame { position: relative; display: grid; width: 100%; height: 100%; min-height: 0; place-items: center; overflow: hidden; background: var(--paper); }
    .editor-host { width: 100%; height: 100%; }
    .crop-mask { position: absolute; inset: 0; display: none; pointer-events: none; }
    .crop-mask-full, .crop-mask-edge { position: absolute; display: block; background: rgba(0, 0, 0, .62); pointer-events: none; }
    .crop-mask-full { inset: 0; }
    .crop-mask-edge { display: none; }
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
    .canvas-minimap {
      position: absolute;
      right: 66px;
      bottom: 20px;
      z-index: 6;
      display: grid;
      width: min(300px, calc(100vw - 48px));
      gap: 8px;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: rgba(255, 255, 255, .96);
      padding: 10px;
      box-shadow: 0 12px 28px rgba(0, 0, 0, .09);
    }
    .canvas-minimap-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      color: var(--ink);
      font-size: 11px;
    }
    .canvas-minimap-header strong { font-weight: 120; }
    .canvas-minimap-close {
      display: grid;
      place-items: center;
      width: 26px;
      height: 26px;
      border: 0;
      background: transparent;
      color: var(--muted);
      padding: 0;
      cursor: pointer;
    }
    .canvas-minimap-close:hover { background: var(--primary-grey); color: var(--ink); }
    .canvas-minimap-close .creation-ui-icon { width: 16px; height: 16px; }
    .canvas-minimap-surface {
      position: relative;
      width: 100%;
      aspect-ratio: 1.52;
      overflow: hidden;
      border: 1px solid var(--line);
      background: #f8f8f8;
      touch-action: none;
      cursor: grab;
    }
    .canvas-minimap-surface.is-dragging { cursor: grabbing; }
    .canvas-minimap-canvas {
      display: block;
      width: 100%;
      height: 100%;
    }
    .canvas-minimap-viewport {
      position: absolute;
      border: 1px solid rgba(17, 17, 17, .9);
      background: rgba(255, 255, 255, .14);
      box-shadow: 0 0 0 1px rgba(255, 255, 255, .65) inset;
      pointer-events: none;
    }
    .canvas-minimap-viewport.is-empty { opacity: 0; }
    @media (max-width: 767px) { .editor-frame { min-height: 0; } .canvas-corners { width: 15px; height: 15px; } }
    @media (max-width: 767px) {
      .canvas-minimap {
        display: none !important;
      }
    }
  `]
})
export class ImageEditorComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() experimentalMinimapEnabled = true;
  @Output() readonly experimentalMinimapEnabledChange = new EventEmitter<boolean>();
  @ViewChild('editorHost', { static: true }) private readonly editorHost!: ElementRef<HTMLDivElement>;
  @ViewChild('cropMask', { static: true }) private readonly cropMask!: ElementRef<HTMLDivElement>;
  @ViewChild('minimapCanvas') private readonly minimapCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('minimapSurface') private readonly minimapSurface?: ElementRef<HTMLElement>;
  @Output() readonly ready = new EventEmitter<void>();
  @Output() readonly statusChange = new EventEmitter<string>();
  @Output() readonly filterChange = new EventEmitter<boolean>();
  @Output() readonly selectedImageChange = new EventEmitter<string | null>();
  @Output() readonly documentChange = new EventEmitter<string>();

  private editor: any;
  private canvasPanCleanup?: () => void;
  private helpMenuCleanup?: () => void;
  private resizeMenuCleanup?: () => void;
  private resizeInputCleanup?: () => void;
  private cropMenuCleanup?: () => void;
  private textMenuCleanup?: () => void;
  private menuLayoutCleanup?: () => void;
  private canvasChangeCleanup?: () => void;
  private minimapResizeObserver?: ResizeObserver;
  private minimapRefreshFrame?: number;
  private minimapRefreshMode: 'full' | 'viewport' | null = null;
  private minimapRenderInProgress = false;
  private minimapRenderToken = 0;
  private textModeActive = false;
  private readonly textModeObjectState = new Map<any, { evented: boolean; selectable: boolean; hoverCursor: any }>();
  private readonly defaultShapeSize = 128;
  private resizeActions?: any;
  private resizeSession?: {
    target: any;
    objectId: number;
    originalScaleX: number;
    originalScaleY: number;
  };
  private selectedObject: any | null = null;
  private maskTarget: any | null = null;
  private imageProcessingBehaviorAttached = false;
  private skipResizeReset = false;
  private workspaceResizeObserver?: ResizeObserver;
  private rotationSyncFrame?: number;
  private workspaceCanvasExpanded = false;
  private workspaceZoomBase = 1;
  private defaultImageFitFactor = 1;
  cropActive = false;
  private cropMaskCanvas?: HTMLElement;
  private grayscaleActive = false;
  private documentChangesEnabled = false;
  private minimapBounds: MinimapBounds | null = null;
  private minimapMetrics: MinimapMetrics | null = null;
  private minimapDraggingPointerId: number | null = null;
  minimapDragging = false;
  minimapReady = false;
  minimapViewport = { left: 0, top: 0, width: 0, height: 0 };
  imageReady = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['experimentalMinimapEnabled']) return;

    if (!this.experimentalMinimapEnabled) {
      this.teardownExperimentalMinimap();
      return;
    }

    window.setTimeout(() => {
      this.syncExperimentalMinimapLifecycle();
      this.scheduleExperimentalMinimapRefresh('full');
    });
  }

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
      selectionStyle: CREATION_SELECTION_STYLE
    });
    this.attachRotationBehavior();
    this.attachSelectionEvents();
    this.attachDocumentChangeEvents();
    this.attachCanvasPan();
    this.attachMenuLayoutBehavior();
    this.attachHelpMenuActions();
    this.attachImageProcessingBehavior();
    this.observeWorkspaceResize();
    this.syncExperimentalMinimapLifecycle();
    void this.loadImageFromUrl(DEMO_ART_DATA_URL, 'Creation study');
  }

  ngOnDestroy(): void {
    this.canvasPanCleanup?.();
    this.helpMenuCleanup?.();
    this.resizeMenuCleanup?.();
    this.resizeInputCleanup?.();
    this.cropMenuCleanup?.();
    this.textMenuCleanup?.();
    this.menuLayoutCleanup?.();
    this.canvasChangeCleanup?.();
    this.teardownExperimentalMinimap();
    this.leaveTextMode();
    if (this.rotationSyncFrame != null) window.cancelAnimationFrame(this.rotationSyncFrame);
    this.workspaceResizeObserver?.disconnect();
    this.editor?.destroy();
  }

  private attachSelectionEvents(): void {
    this.editor.on('objectActivated', (objectProps: any) => {
      if (objectProps?.type === 'cropzone' || objectProps?.type === 'activeSelection') return;

      const activeObject = this.editor._graphics?.getActiveObject?.();
      if (!activeObject) return;

      this.applySelectionStyle(activeObject);
      this.selectedObject = activeObject;
      this.emitSelectedImage(activeObject);
      this.updateImageProcessingPanelHints();
      if (this.editor.ui?.submenu === 'resize') {
        this.beginResizeSession(this.getResizeTarget());
        this.syncResizePanel();
      }
    });
    this.editor.on('objectModified', () => {
      const activeObject = this.getActiveObject();
      if (activeObject?.type === 'image') this.emitSelectedImage(activeObject);
    });
    this.editor.on('selectionCleared', () => {
      const resizeMenuOpen = this.editor.ui?.submenu === 'resize';
      if (resizeMenuOpen && this.resizeSession) {
        this.restoreResizeSession();
        this.resizeSession = undefined;
      }
      this.selectedObject = null;
      this.maskTarget = null;
      this.selectedImageChange.emit(null);
      this.updateImageProcessingPanelHints();
      if (resizeMenuOpen) this.syncResizePanel();
    });
  }

  private attachDocumentChangeEvents(): void {
    const canvas = this.editor?._graphics?.getCanvas?.();
    if (!canvas) return;

    const eventNames = ['object:added', 'object:removed', 'object:modified', 'path:created', 'text:changed'];
    const onCanvasChange = (): void => {
      this.emitDocumentSnapshot();
      this.scheduleExperimentalMinimapRefresh('full');
    };
    eventNames.forEach((eventName) => canvas.on(eventName, onCanvasChange));
    this.canvasChangeCleanup = () => eventNames.forEach((eventName) => canvas.off(eventName, onCanvasChange));
  }

  private emitDocumentSnapshot(): void {
    if (!this.documentChangesEnabled || this.cropActive) return;

    const snapshot = this.getDocumentSnapshot();
    if (!snapshot) return;
    this.documentChange.emit(snapshot);
  }

  private syncExperimentalMinimapLifecycle(): void {
    if (!this.experimentalMinimapEnabled) {
      this.teardownExperimentalMinimap();
      return;
    }

    const surface = this.minimapSurface?.nativeElement;
    const canvas = this.minimapCanvas?.nativeElement;
    if (!this.editor || !surface || !canvas) return;

    if (typeof ResizeObserver !== 'undefined' && !this.minimapResizeObserver) {
      this.minimapResizeObserver = new ResizeObserver(() => this.scheduleExperimentalMinimapRefresh('full'));
      this.minimapResizeObserver.observe(surface);
    }
  }

  private teardownExperimentalMinimap(): void {
    if (this.minimapRefreshFrame != null) {
      window.cancelAnimationFrame(this.minimapRefreshFrame);
      this.minimapRefreshFrame = undefined;
    }
    this.minimapRefreshMode = null;
    this.minimapResizeObserver?.disconnect();
    this.minimapResizeObserver = undefined;
    this.minimapRenderToken += 1;
    this.minimapRenderInProgress = false;
    this.minimapDraggingPointerId = null;
    this.minimapDragging = false;
    this.minimapBounds = null;
    this.minimapMetrics = null;
    this.minimapReady = false;
    this.minimapViewport = { left: 0, top: 0, width: 0, height: 0 };
    this.clearExperimentalMinimapCanvas();
  }

  private scheduleExperimentalMinimapRefresh(mode: 'full' | 'viewport' = 'full'): void {
    if (!this.experimentalMinimapEnabled || !this.editor) return;

    this.syncExperimentalMinimapLifecycle();
    this.minimapRefreshMode = this.minimapRefreshMode === 'full' || mode === 'full' ? 'full' : mode;
    if (this.minimapRefreshFrame != null || this.minimapRenderInProgress) return;

    this.minimapRefreshFrame = window.requestAnimationFrame(() => {
      this.minimapRefreshFrame = undefined;
      const nextMode = this.minimapRefreshMode;
      this.minimapRefreshMode = null;
      if (!nextMode) return;

      if (nextMode === 'viewport') {
        this.updateExperimentalMinimapViewport();
      } else {
        void this.renderExperimentalMinimapSnapshot();
      }
    });
  }

  private async renderExperimentalMinimapSnapshot(): Promise<void> {
    const canvas = this.editor?._graphics?.getCanvas?.();
    const visibleCanvas = this.minimapCanvas?.nativeElement;
    const surface = this.minimapSurface?.nativeElement;
    if (!canvas || !visibleCanvas || !surface) return;

    const renderToken = ++this.minimapRenderToken;
    this.minimapRenderInProgress = true;
    try {
      const bounds = this.getExperimentalMinimapBounds(canvas);
      if (!bounds) {
        this.minimapReady = false;
        this.clearExperimentalMinimapCanvas();
        return;
      }
      const metrics = this.getExperimentalMinimapMetrics(surface, bounds);
      if (!bounds || !metrics) {
        this.minimapReady = false;
        this.clearExperimentalMinimapCanvas();
        return;
      }

      this.minimapBounds = bounds;
      this.minimapMetrics = metrics;
      visibleCanvas.width = metrics.pixelWidth;
      visibleCanvas.height = metrics.pixelHeight;
      visibleCanvas.style.width = `${metrics.cssWidth}px`;
      visibleCanvas.style.height = `${metrics.cssHeight}px`;

      const fitScale = metrics.scale;
      const offsetX = metrics.padX;
      const offsetY = metrics.padY;
      const snapshot = this.renderCanvasForMinimap(canvas, metrics.pixelWidth, metrics.pixelHeight, [
        fitScale,
        0,
        0,
        fitScale,
        offsetX - bounds.left * fitScale,
        offsetY - bounds.top * fitScale,
      ]);
      if (renderToken !== this.minimapRenderToken || !this.experimentalMinimapEnabled || !snapshot) {
        return;
      }

      const context = visibleCanvas.getContext('2d');
      if (!context) return;
      context.clearRect(0, 0, metrics.pixelWidth, metrics.pixelHeight);
      context.drawImage(snapshot, 0, 0, metrics.pixelWidth, metrics.pixelHeight);

      this.minimapReady = true;
      this.updateExperimentalMinimapViewport({
        bounds,
        metrics,
        fitScale,
        offsetX,
        offsetY,
      });
    } finally {
      this.minimapRenderInProgress = false;
      if (this.minimapRefreshMode) {
        const nextMode = this.minimapRefreshMode;
        this.minimapRefreshMode = null;
        this.scheduleExperimentalMinimapRefresh(nextMode);
      }
    }
  }

  private updateExperimentalMinimapViewport(preset?: {
    bounds: MinimapBounds;
    metrics: MinimapMetrics;
    fitScale: number;
    offsetX: number;
    offsetY: number;
  }): void {
    const canvas = this.editor?._graphics?.getCanvas?.();
    const visibleCanvas = this.minimapCanvas?.nativeElement;
    if (!canvas || !visibleCanvas) return;

    const bounds = preset?.bounds ?? this.minimapBounds;
    const metrics = preset?.metrics ?? this.minimapMetrics;
    if (!bounds || !metrics) {
      this.scheduleExperimentalMinimapRefresh('full');
      return;
    }

    const fitScale = preset?.fitScale ?? Math.min(
      metrics.pixelWidth / Math.max(1, bounds.width),
      metrics.pixelHeight / Math.max(1, bounds.height)
    );
    const offsetX = preset?.offsetX ?? (metrics.pixelWidth - bounds.width * fitScale) / 2;
    const offsetY = preset?.offsetY ?? (metrics.pixelHeight - bounds.height * fitScale) / 2;
    const viewport = typeof canvas.calcViewportBoundaries === 'function'
      ? canvas.calcViewportBoundaries()
      : null;
    if (!viewport?.tl || !viewport?.br) {
      this.minimapViewport = { left: offsetX, top: offsetY, width: 0, height: 0 };
      return;
    }

    const devicePixelRatio = Math.max(1, window.devicePixelRatio || 1);
    const viewportLeft = offsetX + (viewport.tl.x - bounds.left) * fitScale;
    const viewportTop = offsetY + (viewport.tl.y - bounds.top) * fitScale;
    const viewportRight = offsetX + (viewport.br.x - bounds.left) * fitScale;
    const viewportBottom = offsetY + (viewport.br.y - bounds.top) * fitScale;
    const left = Math.max(0, Math.min(metrics.pixelWidth, viewportLeft));
    const top = Math.max(0, Math.min(metrics.pixelHeight, viewportTop));
    const right = Math.max(0, Math.min(metrics.pixelWidth, viewportRight));
    const bottom = Math.max(0, Math.min(metrics.pixelHeight, viewportBottom));

    this.minimapViewport = {
      left: left / devicePixelRatio,
      top: top / devicePixelRatio,
      width: Math.max(1, (right - left) / devicePixelRatio),
      height: Math.max(1, (bottom - top) / devicePixelRatio),
    };
  }

  private clearExperimentalMinimapCanvas(): void {
    const visibleCanvas = this.minimapCanvas?.nativeElement;
    const context = visibleCanvas?.getContext('2d');
    if (visibleCanvas && context) {
      context.clearRect(0, 0, visibleCanvas.width, visibleCanvas.height);
    }
  }

  private getExperimentalMinimapBounds(canvas: any): MinimapBounds | null {
    const items = [
      ...(Array.isArray(canvas?.getObjects?.()) ? canvas.getObjects() : []),
      canvas?.backgroundImage,
      canvas?.overlayImage,
    ].filter((item: any) => Boolean(item) && item.type !== 'cropzone' && item.type !== 'activeSelection' && item.visible !== false);

    if (!items.length) {
      const width = Math.max(1, Number(canvas?.getWidth?.()) || 1);
      const height = Math.max(1, Number(canvas?.getHeight?.()) || 1);
      return { left: 0, top: 0, width, height };
    }

    let left = Number.POSITIVE_INFINITY;
    let top = Number.POSITIVE_INFINITY;
    let right = Number.NEGATIVE_INFINITY;
    let bottom = Number.NEGATIVE_INFINITY;

    items.forEach((item: any) => {
      const rect = item?.getBoundingRect?.(true, true) ?? item?.getBoundingRect?.(true) ?? item?.getBoundingRect?.();
      if (!rect) return;
      const rectLeft = Number(rect.left);
      const rectTop = Number(rect.top);
      const rectWidth = Number(rect.width);
      const rectHeight = Number(rect.height);
      if (![rectLeft, rectTop, rectWidth, rectHeight].every((value) => Number.isFinite(value))) return;

      left = Math.min(left, rectLeft);
      top = Math.min(top, rectTop);
      right = Math.max(right, rectLeft + rectWidth);
      bottom = Math.max(bottom, rectTop + rectHeight);
    });

    if (![left, top, right, bottom].every((value) => Number.isFinite(value))) {
      const width = Math.max(1, Number(canvas?.getWidth?.()) || 1);
      const height = Math.max(1, Number(canvas?.getHeight?.()) || 1);
      return { left: 0, top: 0, width, height };
    }

    const viewport = canvas?.calcViewportBoundaries?.();
    const viewportLeft = Number(viewport?.tl?.x);
    const viewportTop = Number(viewport?.tl?.y);
    const viewportRight = Number(viewport?.br?.x);
    const viewportBottom = Number(viewport?.br?.y);
    if ([viewportLeft, viewportTop, viewportRight, viewportBottom].every((value) => Number.isFinite(value))) {
      left = Math.min(left, viewportLeft);
      top = Math.min(top, viewportTop);
      right = Math.max(right, viewportRight);
      bottom = Math.max(bottom, viewportBottom);
    }

    const width = Math.max(1, right - left);
    const height = Math.max(1, bottom - top);
    const zoom = Math.max(0.05, Number(canvas?.getZoom?.()) || 1);
    const viewportWidth = Math.max(1, (Number(canvas?.getWidth?.()) || 1) / zoom);
    const viewportHeight = Math.max(1, (Number(canvas?.getHeight?.()) || 1) / zoom);
    const paddingX = Math.max(32, Math.round(width * 0.08), Math.round(viewportWidth * 0.5));
    const paddingY = Math.max(32, Math.round(height * 0.08), Math.round(viewportHeight * 0.5));
    return {
      left: left - paddingX,
      top: top - paddingY,
      width: width + paddingX * 2,
      height: height + paddingY * 2,
    };
  }

  private getExperimentalMinimapMetrics(surface: HTMLElement, bounds: MinimapBounds): MinimapMetrics | null {
    const rect = surface.getBoundingClientRect();
    const cssWidth = Math.max(1, Math.round(rect.width));
    const cssHeight = Math.max(1, Math.round(rect.height));
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const pixelWidth = Math.max(1, Math.round(cssWidth * dpr));
    const pixelHeight = Math.max(1, Math.round(cssHeight * dpr));
    const usableWidth = Math.max(1, pixelWidth - 16);
    const usableHeight = Math.max(1, pixelHeight - 16);
    const scale = Math.min(usableWidth / bounds.width, usableHeight / bounds.height);
    const renderWidth = bounds.width * scale;
    const renderHeight = bounds.height * scale;
    const padX = (pixelWidth - renderWidth) / 2;
    const padY = (pixelHeight - renderHeight) / 2;

    return {
      cssWidth,
      cssHeight,
      pixelWidth,
      pixelHeight,
      scale,
      padX,
      padY,
    };
  }

  private renderCanvasForMinimap(canvas: any, width: number, height: number, viewportTransform: number[]): HTMLCanvasElement | null {
    const snapshot = document.createElement('canvas');
    snapshot.width = width;
    snapshot.height = height;
    const context = snapshot.getContext('2d');
    if (!context || typeof canvas?.renderCanvas !== 'function') return null;

    const originalState = {
      width: canvas.width,
      height: canvas.height,
      viewportTransform: Array.isArray(canvas.viewportTransform) ? [...canvas.viewportTransform] : null,
      interactive: canvas.interactive,
      contextTop: canvas.contextTop,
      enableRetinaScaling: canvas.enableRetinaScaling,
    };

    try {
      canvas.cancelRequestedRender?.();
      canvas.width = width;
      canvas.height = height;
      canvas.viewportTransform = viewportTransform;
      canvas.interactive = false;
      canvas.contextTop = null;
      canvas.enableRetinaScaling = false;
      canvas.calcViewportBoundaries?.();
      const objects = (canvas._objects ?? canvas.getObjects?.() ?? [])
        .filter((object: any) => object?.visible !== false && object?.type !== 'cropzone' && object?.type !== 'activeSelection');
      canvas.renderCanvas(context, objects);
      return snapshot;
    } catch {
      return null;
    } finally {
      canvas.width = originalState.width;
      canvas.height = originalState.height;
      if (originalState.viewportTransform) canvas.viewportTransform = originalState.viewportTransform;
      canvas.interactive = originalState.interactive;
      canvas.contextTop = originalState.contextTop;
      canvas.enableRetinaScaling = originalState.enableRetinaScaling;
      canvas.calcViewportBoundaries?.();
      canvas.requestRenderAll?.();
    }
  }

  setExperimentalMinimapEnabled(visible: boolean): void {
    this.experimentalMinimapEnabledChange.emit(visible);
  }

  onMinimapPointerDown(event: PointerEvent): void {
    if (!this.experimentalMinimapEnabled || !this.minimapReady) return;

    const canvas = this.editor?._graphics?.getCanvas?.();
    const visibleCanvas = this.minimapCanvas?.nativeElement;
    const surface = this.minimapSurface?.nativeElement;
    const bounds = this.minimapBounds;
    const metrics = this.minimapMetrics;
    if (!canvas || !visibleCanvas || !surface || !bounds || !metrics) return;

    this.minimapDraggingPointerId = event.pointerId;
    this.minimapDragging = true;
    surface.setPointerCapture?.(event.pointerId);
    this.recenterCanvasFromMinimapEvent(event, canvas, bounds, metrics);
    event.preventDefault();
  }

  onMinimapPointerMove(event: PointerEvent): void {
    if (!this.minimapDragging || this.minimapDraggingPointerId !== event.pointerId) return;

    const canvas = this.editor?._graphics?.getCanvas?.();
    const bounds = this.minimapBounds;
    const metrics = this.minimapMetrics;
    if (!canvas || !bounds || !metrics) return;

    this.recenterCanvasFromMinimapEvent(event, canvas, bounds, metrics);
    event.preventDefault();
  }

  onMinimapPointerUp(event: PointerEvent): void {
    if (this.minimapDraggingPointerId !== event.pointerId) return;

    this.minimapDraggingPointerId = null;
    this.minimapDragging = false;
    this.minimapSurface?.nativeElement.releasePointerCapture?.(event.pointerId);
  }

  private recenterCanvasFromMinimapEvent(
    event: PointerEvent,
    canvas: any,
    bounds: MinimapBounds,
    metrics: MinimapMetrics
  ): void {
    const fitScale = metrics.scale;
    const surfaceRect = this.minimapCanvas?.nativeElement.getBoundingClientRect();
    if (!surfaceRect?.width || !surfaceRect?.height) return;

    const localX = ((event.clientX - surfaceRect.left) / surfaceRect.width) * metrics.pixelWidth;
    const localY = ((event.clientY - surfaceRect.top) / surfaceRect.height) * metrics.pixelHeight;
    const targetX = bounds.left + (localX - metrics.padX) / fitScale;
    const targetY = bounds.top + (localY - metrics.padY) / fitScale;
    const zoom = Math.max(0.05, Number(canvas.getZoom?.()) || 1);
    const viewportWidth = Number(canvas.getWidth?.()) || 1;
    const viewportHeight = Number(canvas.getHeight?.()) || 1;
    const worldViewportWidth = viewportWidth / zoom;
    const worldViewportHeight = viewportHeight / zoom;
    const centerX = this.clampMinimapCenter(targetX, bounds.left, bounds.left + bounds.width, worldViewportWidth);
    const centerY = this.clampMinimapCenter(targetY, bounds.top, bounds.top + bounds.height, worldViewportHeight);
    const topLeft = { x: centerX - worldViewportWidth / 2, y: centerY - worldViewportHeight / 2 };
    canvas.setViewportTransform?.([
      zoom,
      0,
      0,
      zoom,
      -topLeft.x * zoom,
      -topLeft.y * zoom,
    ]);
    canvas.calcOffset?.();
    canvas.requestRenderAll?.();
    this.scheduleExperimentalMinimapRefresh('viewport');
  }

  private clampMinimapCenter(value: number, min: number, max: number, viewportSize: number): number {
    const midpoint = (min + max) / 2;
    const minCenter = min + viewportSize / 2;
    const maxCenter = max - viewportSize / 2;
    if (minCenter > maxCenter) return midpoint;
    return Math.max(minCenter, Math.min(maxCenter, value));
  }

  getDocumentSnapshot(): string | null {
    const canvas = this.editor?._graphics?.getCanvas?.();
    if (!canvas?.toJSON) return null;

    try {
      return JSON.stringify(canvas.toJSON());
    } catch {
      // A local snapshot is best effort and must never interrupt editing.
      return null;
    }
  }

  private attachResizeBehavior(): void {
    const resizeActions = this.editor.ui?._actions?.resize;
    const resizeButton = this.editor.ui?._buttonElements?.resize as HTMLElement | undefined;
    if (!resizeActions || !resizeButton || this.resizeActions) return;

    this.resizeActions = resizeActions;
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

    const resizeInputs = this.editorHost.nativeElement.querySelectorAll<HTMLInputElement>(
      '.tie-width-range-value, .tie-height-range-value'
    );
    const stopResizeInputDeleteShortcut = (event: KeyboardEvent): void => {
      // TUI's document-level delete shortcut must not remove the selected image
      // while the user is clearing or editing a resize value.
      if (event.key === 'Backspace' || event.key === 'Delete') event.stopPropagation();
    };
    resizeInputs.forEach((input) => input.addEventListener('keydown', stopResizeInputDeleteShortcut, true));
    this.resizeInputCleanup = () => resizeInputs.forEach((input) => input.removeEventListener('keydown', stopResizeInputDeleteShortcut, true));

    const onResizeMenuClick = (event: MouseEvent): void => {
      this.leaveTextMode();
      event.preventDefault();
      event.stopImmediatePropagation();

      const isOpen = this.editor.ui?.submenu === 'resize';
      if (!isOpen) this.beginResizeSession(this.getResizeTarget());
      this.editor.ui.changeMenu('resize', true, false);
      this.syncResizePanel();
    };
    resizeButton.addEventListener('click', onResizeMenuClick, true);
    this.resizeMenuCleanup = () => resizeButton.removeEventListener('click', onResizeMenuClick, true);
  }

  private attachRotationBehavior(): void {
    const editor = this.editor;
    if (!editor || editor.__creationRotationPatched) return;

    const nativeRotate = typeof editor.rotate === 'function' ? editor.rotate.bind(editor) : null;
    const nativeSetAngle = typeof editor.setAngle === 'function' ? editor.setAngle.bind(editor) : null;
    const nativeUndo = typeof editor.undo === 'function' ? editor.undo.bind(editor) : null;
    const nativeRedo = typeof editor.redo === 'function' ? editor.redo.bind(editor) : null;
    if (!nativeRotate || !nativeSetAngle || !nativeUndo || !nativeRedo) return;

    editor.__creationRotationPatched = true;
    const runAndSync = (operation: () => Promise<any>): Promise<any> => {
      try {
        return Promise.resolve(operation()).then(
          (result) => {
            this.scheduleRotationSync();
            return result;
          },
          (error) => {
            this.scheduleRotationSync();
            return Promise.reject(error);
          }
        );
      } catch (error) {
        this.scheduleRotationSync();
        return Promise.reject(error);
      }
    };

    editor.rotate = (angle: number, isSilent?: boolean): Promise<any> =>
      runAndSync(() => nativeRotate(angle, isSilent));
    editor.setAngle = (angle: number, isSilent?: boolean): Promise<any> =>
      runAndSync(() => nativeSetAngle(angle, isSilent));
    editor.undo = (...args: any[]): Promise<any> => runAndSync(() => nativeUndo(...args));
    editor.redo = (...args: any[]): Promise<any> => runAndSync(() => nativeRedo(...args));
  }

  private scheduleRotationSync(): void {
    if (this.rotationSyncFrame != null) return;

    this.rotationSyncFrame = window.requestAnimationFrame(() => {
      this.rotationSyncFrame = undefined;
      this.expandCanvasToWorkspace();
    });
  }

  private ensureCropMaskLayer(canvas: any): HTMLElement | null {
    const mask = this.cropMask?.nativeElement;
    const canvasContainer = (canvas?.lowerCanvasEl?.parentElement || canvas?.upperCanvasEl?.parentElement) as HTMLElement | null;
    if (!mask || !canvasContainer) return null;

    if (mask.parentElement !== canvasContainer) {
      const upperCanvas = canvas.upperCanvasEl as Node | undefined;
      canvasContainer.insertBefore(mask, upperCanvas && upperCanvas.parentNode === canvasContainer ? upperCanvas : null);
    }
    this.cropMaskCanvas = canvasContainer;
    return mask;
  }

  private hideCropMask(): void {
    const mask = this.cropMask?.nativeElement;
    if (mask) {
      mask.classList.remove('is-visible');
      mask.style.display = 'none';
    }
  }

  private showCropMask(): void {
    this.syncCropMask();
  }

  private syncCropMask(): void {
    const canvas = this.editor?._graphics?.getCanvas?.();
    const mask = this.ensureCropMaskLayer(canvas);
    if (!mask) return;
    if (!this.cropActive) {
      mask.classList.remove('is-visible');
      mask.style.display = 'none';
      return;
    }

    mask.classList.add('is-visible');
    mask.style.display = 'block';
    const fullMask = mask.querySelector<HTMLElement>('.crop-mask-full');
    const edges = {
      top: mask.querySelector<HTMLElement>('.crop-mask-top'),
      right: mask.querySelector<HTMLElement>('.crop-mask-right'),
      bottom: mask.querySelector<HTMLElement>('.crop-mask-bottom'),
      left: mask.querySelector<HTMLElement>('.crop-mask-left'),
    };
    const hideEdges = (): void => Object.values(edges).forEach((edge) => {
      if (edge) edge.style.display = 'none';
    });
    const showFullMask = (): void => {
      hideEdges();
      if (fullMask) fullMask.style.display = 'block';
    };

    const cropzone = this.editor?._graphics?.getComponent?.('CROPPER')?._cropzone;
    if (!cropzone || !this.isCropzoneInViewport(cropzone, canvas)) {
      showFullMask();
      return;
    }

    const viewport = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
    const scaleX = Number(viewport[0]) || 1;
    const scaleY = Number(viewport[3]) || 1;
    const offsetX = Number(viewport[4]) || 0;
    const offsetY = Number(viewport[5]) || 0;
    const logicalLeft = Number(cropzone.left) || 0;
    const logicalTop = Number(cropzone.top) || 0;
    const logicalWidth = Math.abs(Number(cropzone.width) || 0) * Math.abs(Number(cropzone.scaleX) || 1);
    const logicalHeight = Math.abs(Number(cropzone.height) || 0) * Math.abs(Number(cropzone.scaleY) || 1);
    const screenLeft = Math.min(logicalLeft * scaleX + offsetX, (logicalLeft + logicalWidth) * scaleX + offsetX);
    const screenTop = Math.min(logicalTop * scaleY + offsetY, (logicalTop + logicalHeight) * scaleY + offsetY);
    const screenRight = Math.max(logicalLeft * scaleX + offsetX, (logicalLeft + logicalWidth) * scaleX + offsetX);
    const screenBottom = Math.max(logicalTop * scaleY + offsetY, (logicalTop + logicalHeight) * scaleY + offsetY);
    const canvasWidth = Math.max(1, Number(canvas.getWidth?.()) || this.cropMaskCanvas?.clientWidth || 1);
    const canvasHeight = Math.max(1, Number(canvas.getHeight?.()) || this.cropMaskCanvas?.clientHeight || 1);
    const left = Math.max(0, Math.min(canvasWidth, screenLeft));
    const top = Math.max(0, Math.min(canvasHeight, screenTop));
    const right = Math.max(left, Math.min(canvasWidth, screenRight));
    const bottom = Math.max(top, Math.min(canvasHeight, screenBottom));

    if (fullMask) fullMask.style.display = 'none';
    const setEdge = (edge: HTMLElement | null, leftValue: number, topValue: number, width: number, height: number): void => {
      if (!edge) return;
      edge.style.display = 'block';
      edge.style.left = `${Math.max(0, leftValue)}px`;
      edge.style.top = `${Math.max(0, topValue)}px`;
      edge.style.width = `${Math.max(0, width)}px`;
      edge.style.height = `${Math.max(0, height)}px`;
    };
    setEdge(edges.top, 0, 0, canvasWidth, top);
    setEdge(edges.right, right, top, canvasWidth - right, bottom - top);
    setEdge(edges.bottom, 0, bottom, canvasWidth, canvasHeight - bottom);
    setEdge(edges.left, 0, top, left, bottom - top);
  }

  private attachCropBehavior(): void {
    const cropButton = this.editor.ui?._buttonElements?.crop as HTMLElement | undefined;
    const menu = cropButton?.parentElement;
    if (!cropButton || !menu || this.cropMenuCleanup) return;
    const canvas = this.editor?._graphics?.getCanvas?.();
    if (!canvas) return;

    const nativeCrop = this.editor.crop?.bind(this.editor);
    if (nativeCrop && !this.editor.__creationCropPatched) {
      this.editor.__creationCropPatched = true;
      this.editor.crop = (...args: any[]): Promise<any> => {
        const canvas = this.editor?._graphics?.getCanvas?.();
        const previousViewport = Array.isArray(canvas?.viewportTransform)
          ? [...canvas.viewportTransform]
          : [1, 0, 0, 1, 0, 0];

        // Fabric's cropped export applies the current viewport transform to
        // the output. Generate the crop in image coordinates, then let the
        // workspace fit the newly loaded image back into the editor.
        canvas?.setViewportTransform?.([1, 0, 0, 1, 0, 0]);
        let cropPromise: Promise<any>;
        try {
          cropPromise = Promise.resolve(nativeCrop(...args));
        } catch (error) {
          canvas?.setViewportTransform?.(previousViewport);
          return Promise.reject(error);
        }

        return cropPromise.then((result) => {
          this.cropActive = false;
          this.hideCropMask();
          // TUI replaces the source image and resizes the backing canvas during
          // crop. Refit after its menu transition so the old viewport transform
          // cannot leave the new image displaced or visually stretched.
          window.setTimeout(() => {
            const nextCanvas = this.editor?._graphics?.getCanvas?.();
            const image = nextCanvas?.backgroundImage;
            image?.set({ left: 0, top: 0, scaleX: 1, scaleY: 1 });
            image?.setCoords?.();
            this.workspaceCanvasExpanded = false;
            this.expandCanvasToWorkspace();
          });
          return result;
        }, (error) => {
          canvas?.setViewportTransform?.(previousViewport);
          return Promise.reject(error);
        });
      };
    }

    const onCropMenuClick = (): void => {
      // TUI switches drawing mode in its own click handler. Leave the cropzone
      // empty so the user can draw a selection anywhere on the canvas.
      window.setTimeout(() => {
        this.cropActive = this.editor.getDrawingMode?.() === 'CROPPER';
        if (this.cropActive) {
          this.expandCanvasToWorkspace();
          this.patchCropzoneOverlayBounds();
          this.prepareCropzoneForDrawing();
          this.showCropMask();
        }
      });
    };

    const revealCropzoneAfterDrawing = (): void => {
      if (!this.cropActive) return;
      window.setTimeout(() => {
        const cropzone = this.editor?._graphics?.getComponent?.('CROPPER')?._cropzone;
        if (!this.cropActive || !cropzone || !this.isCropzoneInViewport(cropzone, canvas)) return;
        cropzone.set({ evented: true, selectable: true, visible: true });
        cropzone.setCoords?.();
        canvas.setActiveObject?.(cropzone);
        canvas.requestRenderAll?.();
        this.syncCropMask();
      });
    };

    const onCropCanvasMouseDown = (event: any): void => {
      if (!this.cropActive || event?.target) return;
      revealCropzoneAfterDrawing();
    };
    const onCropCanvasMouseMove = (): void => revealCropzoneAfterDrawing();
    const syncCropMaskOnCropzoneChange = (event: any): void => {
      if (!this.cropActive || event?.target?.type !== 'cropzone') return;
      this.syncCropMask();
    };
    canvas.on('mouse:down', onCropCanvasMouseDown);
    canvas.on('mouse:move', onCropCanvasMouseMove);
    canvas.on('object:moving', syncCropMaskOnCropzoneChange);
    canvas.on('object:scaling', syncCropMaskOnCropzoneChange);
    canvas.on('object:modified', syncCropMaskOnCropzoneChange);

    const onOtherMenuClick = (event: MouseEvent): void => {
      const target = event.target instanceof Element
        ? event.target.closest<HTMLElement>('.tui-image-editor-item')
        : null;
      if (!target || target === cropButton || target.classList.contains('tie-btn-crop')) return;

      // TUI normally stops the cropper when changing menus, but the custom
      // canvas layout can leave its overlay visible for one render frame.
      this.exitCropMode();
    };

    const onCropPresetClick = (event: MouseEvent): void => {
      const target = event.target instanceof Element
        ? event.target.closest<HTMLElement>('.tie-crop-preset-button .preset')
        : null;
      if (!target) return;

      window.setTimeout(() => {
        if (!this.cropActive) return;
        if (target.classList.contains('preset-none')) {
          this.prepareCropzoneForDrawing();
          return;
        }

        this.constrainCropzoneToCanvas();
      });
    };

    const cancelButton = this.editorHost.nativeElement.querySelector<HTMLElement>('.tui-image-editor-menu-crop .tie-crop-button.action .cancel');
    const onCropCancelClick = (): void => {
      // Let TUI finish its native cancel handler, then clear the custom crop
      // state so the mask and cropzone cannot survive the menu transition.
      window.setTimeout(() => this.exitCropMode());
    };

    cropButton.addEventListener('click', onCropMenuClick);
    menu.addEventListener('click', onOtherMenuClick, true);
    this.editorHost.nativeElement.addEventListener('click', onCropPresetClick);
    cancelButton?.addEventListener('click', onCropCancelClick);
    this.cropMenuCleanup = () => {
      cropButton.removeEventListener('click', onCropMenuClick);
      menu.removeEventListener('click', onOtherMenuClick, true);
      this.editorHost.nativeElement.removeEventListener('click', onCropPresetClick);
      cancelButton?.removeEventListener('click', onCropCancelClick);
      canvas.off('mouse:down', onCropCanvasMouseDown);
      canvas.off('mouse:move', onCropCanvasMouseMove);
      canvas.off('object:moving', syncCropMaskOnCropzoneChange);
      canvas.off('object:scaling', syncCropMaskOnCropzoneChange);
      canvas.off('object:modified', syncCropMaskOnCropzoneChange);
    };
  }

  private exitCropMode(): void {
    const canvas = this.editor?._graphics?.getCanvas?.();
    const activeObject = canvas?.getActiveObject?.();
    const isCropMode = this.cropActive || this.editor.getDrawingMode?.() === 'CROPPER';
    this.hideCropMask();
    if (isCropMode) this.editor.stopDrawingMode?.();
    this.cropActive = false;
    if (activeObject?.type === 'cropzone') canvas.discardActiveObject?.();
    canvas?.requestRenderAll?.();
  }

  private attachTextBehavior(): void {
    const menuNames = this.editor.ui?.options?.menu;
    if (!Array.isArray(menuNames) || this.textMenuCleanup) return;

    const menuButtons = menuNames
      .map((menuName: string) => this.editor.ui?._buttonElements?.[menuName])
      .filter((button: unknown): button is HTMLElement => button instanceof HTMLElement);
    if (!menuButtons.length) return;

    const syncAfterMenuChange = (): void => {
      window.setTimeout(() => this.syncTextMode());
    };
    menuButtons.forEach((button: HTMLElement) => button.addEventListener('click', syncAfterMenuChange));
    this.textMenuCleanup = () => {
      menuButtons.forEach((button: HTMLElement) => button.removeEventListener('click', syncAfterMenuChange));
    };
    this.syncTextMode();
  }

  private syncTextMode(): void {
    if (this.editor?.getDrawingMode?.() === 'TEXT') {
      this.enterTextMode();
    } else {
      this.leaveTextMode();
    }
  }

  private enterTextMode(): void {
    if (this.textModeActive) return;
    const canvas = this.editor?._graphics?.getCanvas?.();
    if (!canvas) return;

    this.textModeActive = true;
    canvas.discardActiveObject?.();
    canvas.forEachObject((object: any) => {
      if (object.type === 'i-text' || object.type === 'text') return;

      this.textModeObjectState.set(object, {
        evented: Boolean(object.evented),
        selectable: Boolean(object.selectable),
        hoverCursor: object.hoverCursor,
      });
      object.set({ evented: false, selectable: false, hoverCursor: 'default' });
    });
    canvas.requestRenderAll?.();
  }

  private leaveTextMode(): void {
    if (!this.textModeActive && !this.textModeObjectState.size) return;
    const canvas = this.editor?._graphics?.getCanvas?.();
    const canvasObjects = new Set<any>(canvas?.getObjects?.() || []);

    this.textModeObjectState.forEach((state, object) => {
      if (!canvasObjects.has(object)) return;
      object.set({
        evented: state.evented,
        selectable: state.selectable,
        hoverCursor: state.hoverCursor,
      });
    });
    this.textModeObjectState.clear();
    this.textModeActive = false;
    canvas?.requestRenderAll?.();
  }

  private exitTextMode(): void {
    this.leaveTextMode();
    const drawingMode = this.editor?.getDrawingMode?.() ?? this.editor?._graphics?.getDrawingMode?.();
    if (drawingMode === 'TEXT') this.editor?.stopDrawingMode?.();
  }

  private getCropViewportBounds(canvas: any): {
    left: number;
    top: number;
    width: number;
    height: number;
    right: number;
    bottom: number;
  } {
    const viewport = canvas?.viewportTransform || [1, 0, 0, 1, 0, 0];
    const scaleX = Math.abs(Number(viewport[0])) || 1;
    const scaleY = Math.abs(Number(viewport[3])) || 1;
    const offsetX = Number(viewport[4]) || 0;
    const offsetY = Number(viewport[5]) || 0;
    const left = -offsetX / scaleX;
    const top = -offsetY / scaleY;
    const width = Math.max(1, Number(canvas?.getWidth?.()) || 1) / scaleX;
    const height = Math.max(1, Number(canvas?.getHeight?.()) || 1) / scaleY;
    return {
      left,
      top,
      width,
      height,
      right: left + width,
      bottom: top + height,
    };
  }

  private isCropzoneInViewport(cropzone: any, canvas: any): boolean {
    const bounds = this.getCropViewportBounds(canvas);
    const left = Number(cropzone?.left);
    const top = Number(cropzone?.top);
    const width = Math.abs(Number(cropzone?.width) || 0) * Math.abs(Number(cropzone?.scaleX) || 1);
    const height = Math.abs(Number(cropzone?.height) || 0) * Math.abs(Number(cropzone?.scaleY) || 1);
    return Number.isFinite(left)
      && Number.isFinite(top)
      && width > 1
      && height > 1
      && left >= bounds.left - 0.01
      && top >= bounds.top - 0.01
      && left + width <= bounds.right + 0.01
      && top + height <= bounds.bottom + 0.01;
  }

  private prepareCropzoneForDrawing(): void {
    const canvas = this.editor?._graphics?.getCanvas?.();
    const cropzone = this.editor?._graphics?.getComponent?.('CROPPER')?._cropzone;
    if (!canvas || !cropzone) return;

    // Keep an invalid cropzone outside the canvas so TUI can render its full
    // dark mask, while the next pointer down still starts a new selection.
    const bounds = this.getCropViewportBounds(canvas);
    cropzone.set({
      left: bounds.left - 10,
      top: bounds.top - 10,
      width: 1,
      height: 1,
      scaleX: 1,
      scaleY: 1,
      presetRatio: null,
      visible: true,
      evented: false,
      selectable: false,
    });
    cropzone.setCoords?.();
    canvas.discardActiveObject?.();
    canvas.selection = false;
    canvas.requestRenderAll?.();
    this.showCropMask();
  }

  private patchCropzoneOverlayBounds(): void {
    const graphics = this.editor?._graphics;
    const canvas = graphics?.getCanvas?.();
    const cropper = graphics?.getComponent?.('CROPPER');
    const cropzone = graphics?.getComponent?.('CROPPER')?._cropzone;
    if (!canvas || !cropper || !cropzone || cropzone.__creationOverlayPatched) return;

    // The workspace uses a centered viewport transform, while TUI's cropper
    // calculates its outer mask from the untransformed canvas origin.
    cropzone._getCoordinates = (): { x: number[]; y: number[] } => {
      const viewport = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
      const scaleX = Number(viewport[0]) || 1;
      const scaleY = Number(viewport[3]) || 1;
      const offsetX = Number(viewport[4]) || 0;
      const offsetY = Number(viewport[5]) || 0;
      const halfWidth = Number(cropzone.width) / 2;
      const halfHeight = Number(cropzone.height) / 2;
      const centerX = (Number(cropzone.left) || 0) + halfWidth;
      const centerY = (Number(cropzone.top) || 0) + halfHeight;
      const visibleLeft = -offsetX / scaleX;
      const visibleTop = -offsetY / scaleY;
      const visibleRight = (canvas.getWidth() - offsetX) / scaleX;
      const visibleBottom = (canvas.getHeight() - offsetY) / scaleY;

      return {
        x: [visibleLeft - centerX, -halfWidth, halfWidth, visibleRight - centerX].map(Math.ceil),
        y: [visibleTop - centerY, -halfHeight, halfHeight, visibleBottom - centerY].map(Math.ceil),
      };
    };
    if (!cropper.__creationDrawingPatched) {
      // TUI clamps a new drag to canvas coordinates starting at (0, 0). The
      // visible workspace can extend beyond that range after fitting/zooming,
      // so use the current viewport as the drawing coordinate space instead.
      cropper._calcRectDimensionFromPoint = (x: number, y: number, presetRatio: number | null = null): {
        left: number;
        top: number;
        width: number;
        height: number;
      } => {
        const bounds = this.getCropViewportBounds(canvas);
        const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));
        const startX = clamp(Number(cropper._startX) || bounds.left, bounds.left, bounds.right);
        const startY = clamp(Number(cropper._startY) || bounds.top, bounds.top, bounds.bottom);
        const endX = clamp(x, bounds.left, bounds.right);
        const endY = clamp(y, bounds.top, bounds.bottom);
        let left = Math.min(endX, startX);
        let top = Math.min(endY, startY);
        let width = Math.abs(endX - startX);
        let height = Math.abs(endY - startY);

        if (cropper._withShiftKey && !presetRatio) {
          const size = Math.min(Math.max(width, height), bounds.right - left, bounds.bottom - top);
          width = size;
          height = size;
          left = endX <= startX ? Math.max(bounds.left, startX - size) : startX;
          top = endY <= startY ? Math.max(bounds.top, startY - size) : startY;
        } else if (presetRatio) {
          height = width / presetRatio;
          if (startX >= endX) left = clamp(startX - width, bounds.left, bounds.right);
          if (startY >= endY) top = clamp(startY - height, bounds.top, bounds.bottom);

          if (top + height > bounds.bottom) {
            height = bounds.bottom - top;
            width = height * presetRatio;
            if (startX >= endX) left = clamp(startX - width, bounds.left, bounds.right);
          }
          if (left + width > bounds.right) {
            width = bounds.right - left;
            height = width / presetRatio;
            if (startY >= endY) top = clamp(startY - height, bounds.top, bounds.bottom);
          }
        }

        return { left, top, width, height };
      };
      cropper.__creationDrawingPatched = true;
    }
    if (!cropzone.__creationValidityPatched) {
      cropzone.isValid = (): boolean => this.isCropzoneInViewport(cropzone, canvas);
      cropzone.__creationValidityPatched = true;
    }
    if (!cropzone.__creationResizePatched) {
      // TUI's cropzone resize math reads getBoundingRect(), which includes the
      // viewport transform. Its pointer is already restored to canvas space,
      // so using that transformed rect makes the opposite corner drift.
      cropzone._getCropzoneRectInfo = (): {
        rectTop: number;
        rectLeft: number;
        rectWidth: number;
        rectHeight: number;
        rectRight: number;
        rectBottom: number;
        canvasWidth: number;
        canvasHeight: number;
      } => {
        const scaleX = Math.abs(Number(cropzone.scaleX) || 1);
        const scaleY = Math.abs(Number(cropzone.scaleY) || 1);
        const rectLeft = Number(cropzone.left) || 0;
        const rectTop = Number(cropzone.top) || 0;
        const rectWidth = Math.abs(Number(cropzone.width) || 0) * scaleX;
        const rectHeight = Math.abs(Number(cropzone.height) || 0) * scaleY;
        const canvasBounds = this.getCropViewportBounds(canvas);

        return {
          rectTop,
          rectLeft,
          rectWidth,
          rectHeight,
          rectRight: rectLeft + rectWidth,
          rectBottom: rectTop + rectHeight,
          canvasWidth: canvasBounds.right,
          canvasHeight: canvasBounds.bottom,
        };
      };
      cropzone.__creationResizePatched = true;
    }
    if (!cropzone.__creationMovementPatched) {
      cropzone._onMoving = (): void => {
        const canvasBounds = this.getCropViewportBounds(canvas);
        const width = Math.abs(Number(cropzone.width) || 0) * Math.abs(Number(cropzone.scaleX) || 1);
        const height = Math.abs(Number(cropzone.height) || 0) * Math.abs(Number(cropzone.scaleY) || 1);
        const maxLeft = Math.max(canvasBounds.left, canvasBounds.right - width);
        const maxTop = Math.max(canvasBounds.top, canvasBounds.bottom - height);

        cropzone.left = Math.min(maxLeft, Math.max(canvasBounds.left, Number(cropzone.left) || 0));
        cropzone.top = Math.min(maxTop, Math.max(canvasBounds.top, Number(cropzone.top) || 0));
        cropzone.canvasEventTrigger?.objectMoved?.(cropzone);
      };
      cropzone.__creationMovementPatched = true;
    }
    cropzone.__creationOverlayPatched = true;
    canvas.requestRenderAll?.();
  }

  private constrainCropzoneToCanvas(): void {
    const canvas = this.editor?._graphics?.getCanvas?.();
    const cropzone = this.editor?._graphics?.getComponent?.('CROPPER')?._cropzone;
    if (!canvas || !cropzone) return;

    const canvasBounds = this.getCropViewportBounds(canvas);
    const ratio = Math.max(0.0001, Math.abs(Number(cropzone.width) || 0) / Math.max(0.0001, Math.abs(Number(cropzone.height) || 0)));
    let width = canvasBounds.width;
    let height = width / ratio;
    if (height > canvasBounds.height) {
      height = canvasBounds.height;
      width = height * ratio;
    }

    cropzone.set({
      left: canvasBounds.left + (canvasBounds.width - width) / 2,
      top: canvasBounds.top + (canvasBounds.height - height) / 2,
      width,
      height,
      scaleX: 1,
      scaleY: 1,
    });
    cropzone.setCoords?.();
    canvas.setActiveObject(cropzone);
    canvas.requestRenderAll?.();
    this.syncCropMask();
  }

  private getActiveObject(): any | null {
    const activeObject = this.editor._graphics?.getActiveObject?.();
    if (!activeObject || activeObject.type === 'activeSelection' || activeObject.type === 'cropzone') return null;
    return activeObject;
  }

  private getImageProcessingTarget(): any | null {
    const target = this.maskTarget || this.getActiveObject();
    const canvas = this.editor?._graphics?.getCanvas?.();
    if (target?.type !== 'image' || !canvas?.getObjects?.().includes(target)) return null;
    return target;
  }

  private getFirstVisibleImageObject(): any | null {
    const canvas = this.editor?._graphics?.getCanvas?.();
    return canvas?.getObjects?.().find((object: any) => (
      object?.type === 'image'
      && object.visible !== false
      && Number(object.opacity ?? 1) > 0
    )) ?? null;
  }

  private attachImageProcessingBehavior(): void {
    const editor = this.editor;
    const graphics = editor?._graphics;
    const actions = editor?.ui?._actions;
    if (!editor || !graphics || !actions || this.imageProcessingBehaviorAttached) return;

    this.imageProcessingBehaviorAttached = true;
    const nativeApplyFilter = editor.applyFilter.bind(editor);
    const nativeRemoveFilter = editor.removeFilter.bind(editor);
    const nativeHasFilter = editor.hasFilter.bind(editor);
    const nativeUndo = editor.undo.bind(editor);
    const nativeRedo = editor.redo.bind(editor);
    const nativeMaskLoad = actions.mask?.loadImageFromURL;
    const nativeMaskApply = actions.mask?.applyFilter;
    const nativeShapeChange = actions.shape?.changeShape;
    const nativeIconChange = actions.icon?.changeColor;

    editor.applyFilter = (type: string, options?: any, isSilent?: boolean): Promise<any> => {
      const target = this.getImageProcessingTarget();
      if (!target) return nativeApplyFilter(type, options, isSilent);

      return this.runWithImageProcessingTarget(target, () => nativeApplyFilter(type, options, isSilent));
    };
    editor.removeFilter = (type: string): Promise<any> => {
      const target = this.getImageProcessingTarget();
      if (!target) return nativeRemoveFilter(type);

      return this.runWithImageProcessingTarget(target, () => nativeRemoveFilter(type));
    };
    editor.hasFilter = (type: string): boolean => {
      const target = this.getImageProcessingTarget();
      if (!target) return nativeHasFilter(type);

      const fabricType = `${type.charAt(0).toUpperCase()}${type.slice(1)}`;
      return Boolean(target.filters?.some((filter: any) => filter?.type === fabricType));
    };
    editor.undo = (...args: any[]): Promise<any> => {
      const target = this.getImageProcessingTarget();
      if (!target || !this.isFilterHistoryCommand('undo')) return nativeUndo(...args);

      return this.runWithImageProcessingTarget(target, () => nativeUndo(...args));
    };
    editor.redo = (...args: any[]): Promise<any> => {
      const target = this.getImageProcessingTarget();
      if (!target || !this.isFilterHistoryCommand('redo')) return nativeRedo(...args);

      return this.runWithImageProcessingTarget(target, () => nativeRedo(...args));
    };

    if (actions.mask) {
      actions.mask.loadImageFromURL = (imgUrl: string, file?: File): Promise<any> => {
        const target = this.getImageProcessingTarget();
        if (!target) return nativeMaskLoad(imgUrl, file);

        this.maskTarget = target;
        return editor.addImageObject(imgUrl).then((maskProps: any) => {
          URL.revokeObjectURL(imgUrl);
          return maskProps;
        });
      };
      actions.mask.applyFilter = (): Promise<any> => {
        const target = this.maskTarget || this.getImageProcessingTarget();
        const maskObject = this.getActiveObject();
        const maskId = Number(graphics.getObjectId?.(maskObject));
        if (!target || !maskObject || maskObject === target || maskObject.type !== 'image' || !Number.isFinite(maskId)) {
          return nativeMaskApply();
        }

        return editor.applyFilter('mask', { maskObjId: maskId }).then((result: any) => {
          this.maskTarget = null;
          graphics.getCanvas()?.setActiveObject?.(target);
          graphics.getCanvas()?.requestRenderAll?.();
          return result;
        });
      };
    }

    if (actions.shape && nativeShapeChange) {
      actions.shape.changeShape = (changeShapeObject: any, isSilent?: boolean): Promise<any> => {
        const target = this.getActiveObject();
        if (target && !['rect', 'circle', 'triangle'].includes(target.type)) return Promise.resolve();
        return nativeShapeChange(changeShapeObject, isSilent);
      };
    }
    if (actions.icon && nativeIconChange) {
      actions.icon.changeColor = (color: string): Promise<any> => {
        const target = this.getActiveObject();
        if (target && target.type !== 'icon') return Promise.resolve();
        return nativeIconChange(color);
      };
    }

    this.updateImageProcessingPanelHints();
  }

  private runWithImageProcessingTarget(target: any, operation: () => Promise<any>): Promise<any> {
    const graphics = this.editor?._graphics;
    const canvas = graphics?.getCanvas?.();
    if (!graphics || !canvas) return operation();

    const previousCanvasImage = graphics.canvasImage;
    graphics.canvasImage = target;
    let result: Promise<any>;
    try {
      result = operation();
    } catch (error) {
      graphics.canvasImage = previousCanvasImage;
      throw error;
    }

    return Promise.resolve(result).then(
      (value) => {
        graphics.canvasImage = previousCanvasImage;
        this.normalizeImageFilters(target);
        target.setCoords?.();
        canvas.requestRenderAll?.();
        this.emitSelectedImage(target);
        this.emitDocumentSnapshot();
        this.scheduleExperimentalMinimapRefresh('full');
        return value;
      },
      (error) => {
        graphics.canvasImage = previousCanvasImage;
        canvas.requestRenderAll?.();
        throw error;
      }
    );
  }

  private isFilterHistoryCommand(direction: 'undo' | 'redo'): boolean {
    const stack = this.editor?._invoker?.[`_${direction}Stack`];
    const command = stack?.[stack.length - 1];
    return command?.name === 'applyFilter' || command?.name === 'removeFilter';
  }

  private normalizeImageFilters(target: any): void {
    // TUI's Mask class inherits Fabric's BlendImage type. Normalize it so the
    // filter menu can find and remove an already-applied mask consistently.
    target.filters?.forEach((filter: any) => {
      if (filter?.mask && filter.type === 'BlendImage') filter.type = 'Mask';
    });
  }

  private applySelectionStyle(target: any | null): void {
    if (!target?.set || target.type === 'cropzone') return;
    target.set(CREATION_SELECTION_STYLE);
    target.setCoords?.();
  }

  private emitSelectedImage(activeObject: any | null): void {
    this.selectedImageChange.emit(this.getSelectedImageDataUrl(activeObject));
  }

  private getSelectedImageDataUrl(activeObject: any | null): string | null {
    if (activeObject?.type !== 'image') return null;

    try {
      const objectDataUrl = activeObject.toDataURL?.({ format: 'png', quality: 0.95, enableRetinaScaling: false });
      if (typeof objectDataUrl === 'string' && objectDataUrl.startsWith('data:image/')) return objectDataUrl;

      const canvas = this.editor?._graphics?.getCanvas?.();
      const bounds = activeObject.getBoundingRect?.();
      if (!canvas || !bounds?.width || !bounds?.height) return null;
      return canvas.toDataURL({
        format: 'png',
        quality: 0.95,
        left: Math.max(0, bounds.left),
        top: Math.max(0, bounds.top),
        width: bounds.width,
        height: bounds.height,
        enableRetinaScaling: false
      });
    } catch {
      return null;
    }
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
    return this.getImageProcessingTarget();
  }

  private getResizeDimensions(): { width: number; height: number } {
    const target = this.getResizeTarget();
    if (!target) return { width: 0, height: 0 };

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
    if (!target || !this.resizeSession) return;

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
    if (!target || !this.resizeSession) return;

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
      if (!standByMode) {
        this.skipResizeReset = true;
        this.editor.ui.changeMenu('resize', true, false);
      }
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
    if (!target || !this.resizeSession) return;

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
    this.scheduleExperimentalMinimapRefresh('full');
  }

  private syncResizePanel(): void {
    if (this.editor.ui?.submenu !== 'resize' || !this.editor.ui.resize) return;
    const target = this.getResizeTarget();
    if (target) {
      const dimensions = this.getResizeDimensions();
      this.beginResizeSession(target);
      this.editor.ui.resize.setWidthValue(dimensions.width);
      this.editor.ui.resize.setHeightValue(dimensions.height);
      this.editor.ui.resize._lockState = false;
      this.editor.ui.resize.setLimit({ minWidth: 32, minHeight: 32, maxWidth: 4088, maxHeight: 4088 });
    } else {
      this.resizeSession = undefined;
    }
    this.updateResizePanelHint(Boolean(target));
    const lockInput = this.editorHost.nativeElement.querySelector<HTMLInputElement>('.tie-lock-aspect-ratio');
    if (lockInput) {
      lockInput.closest('li')?.remove();
    }
  }

  private updateResizePanelHint(hasTarget: boolean): void {
    const resizePanel = this.getResizePanel();
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

    const title = hint.querySelector('strong');
    const description = hint.querySelector('span');
    if (title) title.textContent = 'Image size';
    if (description) {
      description.textContent = hasTarget
        ? 'Width and height control the selected image.'
        : 'Select an image on the canvas to edit width and height.';
    }

    Array.from(submenuItem.children).forEach((child) => {
      if (!(child instanceof HTMLElement)) return;
      if (child.classList.contains('creation-resize-hint') || child.classList.contains('tie-resize-button')) return;
      child.style.display = hasTarget ? '' : 'none';
      child.style.pointerEvents = hasTarget ? '' : 'none';
      child.setAttribute('aria-hidden', String(!hasTarget));
    });

    const applyButton = submenuItem.querySelector<HTMLButtonElement>('.tie-resize-button .apply');
    if (applyButton) applyButton.disabled = !hasTarget;
    submenuItem.querySelectorAll<HTMLInputElement>('.tie-width-range-value, .tie-height-range-value').forEach((input) => {
      input.disabled = !hasTarget;
    });
    this.editor.ui.resize.changeApplyButtonStatus(false);
  }

  private getResizePanel(): HTMLElement | null {
    return Array.from(
      this.editorHost.nativeElement.querySelectorAll<HTMLElement>('.tui-image-editor-submenu > .tui-image-editor-menu-resize')
    ).find((panel) => getComputedStyle(panel).display !== 'none') || null;
  }

  private updateImageProcessingPanelHints(): void {
    const hasSelectedImage = Boolean(this.getImageProcessingTarget());
    const panelCopy = [
      {
        menu: 'filter',
        emptyDescription: 'Select an image to apply filters.',
        selectedDescription: 'Filters apply to the selected image.',
      },
      {
        menu: 'mask',
        emptyDescription: 'Select an image to apply a mask.',
        selectedDescription: 'The mask applies to the selected image.',
      },
    ];

    panelCopy.forEach(({ menu, emptyDescription, selectedDescription }) => {
      const panels = this.editorHost.nativeElement.querySelectorAll<HTMLElement>(
        `.tui-image-editor-submenu > .tui-image-editor-menu-${menu}`
      );

      panels.forEach((panel) => {
        const submenuItem = panel.querySelector<HTMLElement>(':scope > .tui-image-editor-submenu-item');
        if (!submenuItem) return;

        let hint = submenuItem.querySelector<HTMLLIElement>(':scope > .creation-image-processing-hint');
        if (!hint) {
          hint = document.createElement('li');
          hint.className = 'creation-image-processing-hint';
          const title = document.createElement('strong');
          const description = document.createElement('span');
          hint.append(title, description);
          submenuItem.prepend(hint);
        }

        const title = hint.querySelector('strong');
        const description = hint.querySelector('span');
        if (title) title.textContent = hasSelectedImage ? 'Selected image' : 'Image required';
        if (description) description.textContent = hasSelectedImage ? selectedDescription : emptyDescription;
      });
    });
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

  private attachMenuLayoutBehavior(): void {
    const menu = this.editorHost.nativeElement.querySelector<HTMLElement>('.tui-image-editor-menu');
    if (!menu || this.menuLayoutCleanup) return;

    const onMenuClick = (): void => {
      // TUI updates its menu classes after the click handler. Re-center after
      // that update so a closed submenu cannot leave a stale viewport behind.
      window.setTimeout(() => this.expandCanvasToWorkspace());
    };
    menu.addEventListener('click', onMenuClick);
    this.menuLayoutCleanup = () => menu.removeEventListener('click', onMenuClick);
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
    this.workspaceZoomBase = Math.min(maxWidth / image.width, maxHeight / image.height, width / image.width, height / image.height) * this.defaultImageFitFactor;
    const contentScale = Math.min(currentZoom, this.workspaceZoomBase);
    const contentWidth = image.width * contentScale;
    const availableSideMargin = Math.max(0, (width - contentWidth) / 2);
    const contentOffsetX = Math.min(WORKSPACE_CONTENT_OFFSET_X, availableSideMargin);

    canvas.setDimensions({ width, height });
    canvas.setDimensions({ width, height }, { cssOnly: true });
    canvas.setViewportTransform([
      contentScale,
      0,
      0,
      contentScale,
      (width - contentWidth) / 2 + contentOffsetX,
      (height - image.height * contentScale) / 2
    ]);
    canvas.calcOffset?.();
    canvas.requestRenderAll?.();
    this.workspaceCanvasExpanded = true;
    if (this.cropActive) this.syncCropMask();
    this.scheduleExperimentalMinimapRefresh('viewport');
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
      void this.zoomCanvas(target.classList.contains('tie-btn-zoomIn') ? 1.25 : 0.8);
    };

    helpMenu.addEventListener('click', onHelpMenuClick, true);
    const onDocumentPointerDown = (event: PointerEvent): void => {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('.tie-btn-history, .tie-panel-history')) return;

      const historyButton = helpMenu.querySelector<HTMLElement>('.tie-btn-history.opened');
      historyButton?.classList.remove('opened');
    };

    document.addEventListener('pointerdown', onDocumentPointerDown, true);
    this.helpMenuCleanup = () => {
      helpMenu.removeEventListener('click', onHelpMenuClick, true);
      document.removeEventListener('pointerdown', onDocumentPointerDown, true);
    };
  }

  private setCanvasZoom(zoomLevel: number, origin?: { x: number; y: number }, announce = true): boolean {
    const canvas = this.editor?._graphics?.getCanvas?.();
    if (!canvas) return false;

    const currentZoom = Number(canvas.getZoom?.()) || this.workspaceZoomBase || 1;
    const minimumZoom = Math.max(0.05, this.workspaceZoomBase * 0.5);
    const nextZoom = Math.min(5, Math.max(minimumZoom, zoomLevel));
    if (Math.abs(nextZoom - currentZoom) < 0.001) return false;

    canvas.zoomToPoint(origin ?? { x: canvas.getWidth() / 2, y: canvas.getHeight() / 2 }, nextZoom);
    canvas.calcOffset?.();
    canvas.requestRenderAll?.();
    if (this.cropActive) this.syncCropMask();
    if (announce) this.statusChange.emit(`Zoom ${Math.round((nextZoom / this.workspaceZoomBase) * 100)}%.`);
    this.scheduleExperimentalMinimapRefresh('viewport');
    return true;
  }

  private zoomCanvas(factor: number, origin?: { x: number; y: number }, announce = true): void {
    const canvas = this.editor?._graphics?.getCanvas?.();
    if (!canvas) return;

    const currentZoom = Number(canvas.getZoom?.()) || this.workspaceZoomBase || 1;
    void this.setCanvasZoom(currentZoom * factor, origin, announce);
  }

  private attachCanvasPan(): void {
    const canvas = this.editor?._graphics?.getCanvas?.();
    const workspace = this.editorHost.nativeElement.querySelector<HTMLElement>('.tui-image-editor-main-container');
    if (!canvas || !workspace) return;

    const canvasElement = canvas.upperCanvasEl as HTMLElement | undefined;
    let isPanning = false;
    let previousPoint = { x: 0, y: 0 };
    let drawingClickCandidate = false;
    let drawingPointerStart = { x: 0, y: 0 };
    let pinchSession: { startDistance: number; startZoom: number; lastZoom: number } | null = null;
    let isTouchPanning = false;
    const touchPointers = new Map<number, { x: number; y: number }>();
    const canvasContainerSelector = '.tui-image-editor-canvas-container';
    const chromeSelector = '.tui-image-editor-controls, .tui-image-editor-help-menu, .tui-image-editor-submenu';

    const panViewport = (deltaX: number, deltaY: number): void => {
      if (!canvas.viewportTransform) return;
      canvas.viewportTransform[4] += deltaX;
      canvas.viewportTransform[5] += deltaY;
      canvas.requestRenderAll?.();
      if (this.cropActive) this.syncCropMask();
      this.scheduleExperimentalMinimapRefresh('viewport');
    };
    const zoomPercentLabel = (zoomValue: number): string => `Zoom ${Math.round((zoomValue / (this.workspaceZoomBase || 1)) * 100)}%.`;
    const clampZoom = (value: number): number => Math.min(5, Math.max(Math.max(0.05, this.workspaceZoomBase * 0.5), value));
    const toCanvasPoint = (clientX: number, clientY: number): { x: number; y: number } => {
      const target = canvasElement || workspace;
      return canvas.getPointer({ clientX, clientY, target } as any);
    };
    const startPinch = (): void => {
      if (touchPointers.size !== 2) return;
      const [firstPoint, secondPoint] = Array.from(touchPointers.values());
      const startDistance = Math.max(1, Math.hypot(secondPoint.x - firstPoint.x, secondPoint.y - firstPoint.y));
      const startZoom = Number(canvas.getZoom?.()) || this.workspaceZoomBase || 1;
      pinchSession = { startDistance, startZoom, lastZoom: startZoom };
    };
    const updatePinch = (): void => {
      if (!pinchSession || touchPointers.size !== 2) return;
      const [firstPoint, secondPoint] = Array.from(touchPointers.values());
      const currentDistance = Math.max(1, Math.hypot(secondPoint.x - firstPoint.x, secondPoint.y - firstPoint.y));
      const currentCenter = {
        x: (firstPoint.x + secondPoint.x) / 2,
        y: (firstPoint.y + secondPoint.y) / 2,
      };
      const nextZoom = clampZoom(pinchSession.startZoom * (currentDistance / pinchSession.startDistance));
      pinchSession.lastZoom = nextZoom;
      void this.setCanvasZoom(nextZoom, toCanvasPoint(currentCenter.x, currentCenter.y), false);
    };
    const stopPinch = (): void => {
      if (!pinchSession || touchPointers.size >= 2) return;
      const finalZoom = pinchSession.lastZoom;
      const startZoom = pinchSession.startZoom;
      pinchSession = null;
      if (Math.abs(finalZoom - startZoom) < 0.001) return;
      this.statusChange.emit(zoomPercentLabel(finalZoom));
    };
    const isCanvasInteractionModeActive = (): boolean => {
      const drawingMode = this.editor.getDrawingMode?.() ?? this.editor._graphics?.getDrawingMode?.();
      return ['CROPPER', 'FREE_DRAWING', 'LINE_DRAWING', 'SHAPE', 'TEXT', 'ICON', 'ZOOM'].includes(drawingMode);
    };
    const isTouchPointer = (event: any): boolean => Boolean(
      event?.pointerType === 'touch' || event?.touches?.length || event?.changedTouches?.length
    );

    if (canvasElement) {
      canvasElement.style.touchAction = 'none';
      canvasElement.style.overscrollBehavior = 'contain';
    }

    canvas.defaultCursor = 'grab';

    canvas.on('mouse:down', (event: any) => {
      if (touchPointers.size > 0 || pinchSession) return;
      if (isTouchPointer(event.e)) {
        isPanning = false;
        return;
      }
      const drawingMode = this.editor.getDrawingMode?.() ?? this.editor._graphics?.getDrawingMode?.();
      // TUI also creates a new drawing when the pointer starts on an existing
      // object, so an event target must not disqualify a single-click draw.
      drawingClickCandidate = ['SHAPE', 'ICON'].includes(drawingMode) && Boolean(event.e);
      if (drawingClickCandidate) {
        drawingPointerStart = { x: event.e.clientX, y: event.e.clientY };
      }
      if (isCanvasInteractionModeActive() || event.target || this.editor._graphics?.getZoomMode?.() === 'zoom' || !event.e) return;
      isPanning = true;
      previousPoint = { x: event.e.clientX, y: event.e.clientY };
      canvas.defaultCursor = 'grabbing';
    });
    canvas.on('mouse:move', (event: any) => {
      if (isTouchPointer(event.e)) {
        isPanning = false;
        return;
      }
      if (pinchSession) return;
      if (drawingClickCandidate && event.e) {
        const distance = Math.hypot(event.e.clientX - drawingPointerStart.x, event.e.clientY - drawingPointerStart.y);
        if (distance > 4) drawingClickCandidate = false;
      }
      if (touchPointers.size > 0 || pinchSession) {
        isPanning = false;
        return;
      }
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
      if (touchPointers.size > 0 || pinchSession) return;
      const shouldUseDefaultDrawingSize = drawingClickCandidate;
      drawingClickCandidate = false;
      isPanning = false;
      canvas.defaultCursor = 'grab';
      // TUI can create a 0x0 shape when the user clicks instead of dragging.
      // Give that shape a useful starting size after TUI finishes its handler.
      window.setTimeout(() => this.normalizeClickCreatedObject(shouldUseDefaultDrawingSize));
    });

    const onCanvasPointerDown = (event: PointerEvent): void => {
      if (event.pointerType !== 'touch' || !canvasElement) return;
      touchPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      canvasElement.setPointerCapture?.(event.pointerId);
      if (touchPointers.size === 1) {
        const target = typeof canvas.findTarget === 'function' ? canvas.findTarget(event, false) : null;
        isTouchPanning = !isCanvasInteractionModeActive() && !target;
        previousPoint = { x: event.clientX, y: event.clientY };
      }
      if (touchPointers.size === 2) {
        isTouchPanning = false;
        startPinch();
      }
    };
    const onCanvasPointerMove = (event: PointerEvent): void => {
      if (event.pointerType !== 'touch' || !touchPointers.has(event.pointerId)) return;
      touchPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (!pinchSession && touchPointers.size === 2) startPinch();
      if (!pinchSession && touchPointers.size === 1 && isTouchPanning && !isCanvasInteractionModeActive()) {
        panViewport(event.clientX - previousPoint.x, event.clientY - previousPoint.y);
        previousPoint = { x: event.clientX, y: event.clientY };
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (!pinchSession) return;
      event.preventDefault();
      event.stopPropagation();
      updatePinch();
      isPanning = false;
      canvas.defaultCursor = 'grab';
    };
    const onCanvasPointerUp = (event: PointerEvent): void => {
      if (event.pointerType !== 'touch' || !touchPointers.has(event.pointerId)) return;
      touchPointers.delete(event.pointerId);
      if (touchPointers.size === 0) isTouchPanning = false;
      isPanning = false;
      canvasElement?.releasePointerCapture?.(event.pointerId);
      stopPinch();
    };

    const onWorkspacePointerDown = (event: PointerEvent): void => {
      if (event.pointerType === 'touch') return;
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
    const onWorkspaceWheel = (event: WheelEvent): void => {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest(chromeSelector) || touchPointers.size > 0 || pinchSession || isCanvasInteractionModeActive()) return;
      if (!event.deltaY) return;

      event.preventDefault();
      const factor = event.deltaY < 0 ? 1.08 : 1 / 1.08;
      this.zoomCanvas(factor, toCanvasPoint(event.clientX, event.clientY), false);
    };

    workspace.addEventListener('pointerdown', onWorkspacePointerDown);
    workspace.addEventListener('pointermove', onWorkspacePointerMove);
    workspace.addEventListener('pointerup', stopWorkspacePan);
    workspace.addEventListener('pointercancel', stopWorkspacePan);
    workspace.addEventListener('wheel', onWorkspaceWheel, { passive: false });
    canvasElement?.addEventListener('pointerdown', onCanvasPointerDown, true);
    canvasElement?.addEventListener('pointermove', onCanvasPointerMove, true);
    canvasElement?.addEventListener('pointerup', onCanvasPointerUp, true);
    canvasElement?.addEventListener('pointercancel', onCanvasPointerUp, true);
    this.canvasPanCleanup = () => {
      workspace.removeEventListener('pointerdown', onWorkspacePointerDown);
      workspace.removeEventListener('pointermove', onWorkspacePointerMove);
      workspace.removeEventListener('pointerup', stopWorkspacePan);
      workspace.removeEventListener('pointercancel', stopWorkspacePan);
      workspace.removeEventListener('wheel', onWorkspaceWheel);
      canvasElement?.removeEventListener('pointerdown', onCanvasPointerDown, true);
      canvasElement?.removeEventListener('pointermove', onCanvasPointerMove, true);
      canvasElement?.removeEventListener('pointerup', onCanvasPointerUp, true);
      canvasElement?.removeEventListener('pointercancel', onCanvasPointerUp, true);
    };
  }

  private normalizeClickCreatedObject(forceDefaultSize = false): void {
    const canvas = this.editor?._graphics?.getCanvas?.();
    const shape = canvas?.getActiveObject?.();
    if (!canvas || !shape || !['rect', 'circle', 'triangle', 'icon'].includes(shape.type)) return;

    const width = Math.abs(Number(shape.width) * (Number(shape.scaleX) || 1));
    const height = Math.abs(Number(shape.height) * (Number(shape.scaleY) || 1));
    if (!forceDefaultSize && (width > 1 || height > 1)) return;

    const canvasWidth = Number(canvas.getWidth?.()) || this.defaultShapeSize;
    const canvasHeight = Number(canvas.getHeight?.()) || this.defaultShapeSize;
    const size = Math.min(this.defaultShapeSize, canvasWidth * 0.25, canvasHeight * 0.25);
    if (size <= 1) return;

    if (shape.type === 'icon') {
      const currentSize = Math.max(width, height);
      if (currentSize <= 1) return;
      const scale = size / currentSize;
      shape.set({
        scaleX: (Number(shape.scaleX) || 1) * scale,
        scaleY: (Number(shape.scaleY) || 1) * scale,
      });
    } else {
      const dimensions = shape.type === 'circle'
        ? { width: size, height: size, rx: size / 2, ry: size / 2 }
        : { width: size, height: size };
      shape.set({ ...dimensions, scaleX: 1, scaleY: 1 });
    }
    shape.setCoords?.();
    canvas.setActiveObject?.(shape);
    canvas.requestRenderAll?.();
  }

  async handleAction(action: ToolAction): Promise<void> {
    if (!this.editor) return;
    try {
      // The mobile toolbar closes immediately after a tap. Clear any native
      // drawing mode before the next command so the hidden TUI overlays cannot
      // keep intercepting canvas input.
      if (action !== 'crop') this.exitCropMode();
      if (action !== 'text') this.exitTextMode();

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
          await this.applyGrayscaleToImage();
          break;
        case 'crop':
          if (!this.cropActive) {
            this.cropActive = this.editor.startDrawingMode('CROPPER');
            if (this.cropActive) {
              this.expandCanvasToWorkspace();
              this.patchCropzoneOverlayBounds();
              this.prepareCropzoneForDrawing();
            }
            this.statusChange.emit(this.cropActive ? 'Crop area active. Choose a region, then select Crop again to apply.' : 'Crop mode is unavailable.');
          } else {
            const cropRect = this.editor.getCropzoneRect?.();
            if (!cropRect || cropRect.width <= 1 || cropRect.height <= 1) {
              this.statusChange.emit('Choose a crop area first.');
              break;
            }
            await this.editor.crop(cropRect);
            this.exitCropMode();
            this.statusChange.emit('Crop applied.');
          }
          break;
        case 'select':
          this.exitCropMode();
          this.statusChange.emit('Select an object on the canvas.');
          break;
        default: break;
      }
      this.emitDocumentSnapshot();
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
      this.exitCropMode();
      const objectProps = await this.editor.addImageObject(dataUrl);
      this.applySelectionStyle(this.editor._graphics?.getCanvas?.()?.getActiveObject?.());
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
      this.emitDocumentSnapshot();
      this.scheduleExperimentalMinimapRefresh('full');
    } catch {
      this.statusChange.emit('The image could not be added to canvas.');
    }
  }

  async reset(): Promise<void> {
    this.grayscaleActive = false;
    this.filterChange.emit(false);
    await this.loadImageFromUrl(DEMO_ART_DATA_URL, 'Creation study');
    this.emitDocumentSnapshot();
  }

  async restoreDocument(canvasJson: string): Promise<boolean> {
    const canvas = this.editor?._graphics?.getCanvas?.();
    if (!canvas || !canvas.loadFromJSON) return false;

    try {
      this.documentChangesEnabled = false;
      this.leaveTextMode();
      this.selectedObject = null;
      this.resizeSession = undefined;
      await new Promise<void>((resolve, reject) => {
        let settled = false;
        const timeoutId = window.setTimeout(() => {
          if (settled) return;
          settled = true;
          reject(new Error('Saved canvas restore timed out.'));
        }, DOCUMENT_RESTORE_TIMEOUT_MS);

        const finish = (error?: unknown): void => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timeoutId);
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        };

        try {
          canvas.loadFromJSON(canvasJson, () => finish());
        } catch (error) {
          finish(error);
        }
      });
      canvas.getObjects?.().forEach((object: any) => this.applySelectionStyle(object));
      canvas.requestRenderAll?.();
      this.editor.discardSelection?.();
      this.attachResizeBehavior();
      this.attachCropBehavior();
      this.attachTextBehavior();
      this.expandCanvasToWorkspace();
      this.imageReady = true;
      this.grayscaleActive = Boolean(this.editor.hasFilter?.('Grayscale'));
      this.filterChange.emit(this.grayscaleActive);
      this.documentChangesEnabled = true;
      this.scheduleExperimentalMinimapRefresh('full');
      return true;
    } catch {
      this.documentChangesEnabled = true;
      return false;
    }
  }

  async exportImage(): Promise<void> {
    if (!this.editor) return;
    const cropRect = this.editor.getDrawingMode?.() === 'CROPPER'
      ? this.editor.getCropzoneRect?.()
      : null;
    const hasCropSelection = Boolean(cropRect && cropRect.width > 1 && cropRect.height > 1);
    const dataUrl = hasCropSelection
      ? this.exportCropSelection(cropRect)
      : this.editor.toDataURL({ format: 'png', quality: 0.95 });
    const anchor = document.createElement('a');
    anchor.href = dataUrl;
    anchor.download = 'creation-studio-export.png';
    anchor.click();
    this.statusChange.emit(hasCropSelection ? 'Crop selection exported.' : 'Image exported.');
  }

  private exportCropSelection(cropRect: { left: number; top: number; width: number; height: number }): string {
    const canvas = this.editor?._graphics?.getCanvas?.();
    if (!canvas) return this.editor.toDataURL({ format: 'png', quality: 0.95, ...cropRect });

    const originalViewport = Array.isArray(canvas.viewportTransform)
      ? [...canvas.viewportTransform]
      : [1, 0, 0, 1, 0, 0];
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    try {
      return this.editor.toDataURL({ format: 'png', quality: 0.95, ...cropRect });
    } finally {
      canvas.setViewportTransform(originalViewport);
      canvas.calcOffset?.();
      canvas.requestRenderAll?.();
    }
  }

  private async loadImageFromUrl(url: string, name: string): Promise<void> {
    if (!this.editor) return;
    try {
      this.defaultImageFitFactor = url === DEMO_ART_DATA_URL ? 0.68 : 1;
      this.leaveTextMode();
      await this.editor.loadImageFromURL(url, name);
      this.editor.ui?.activeMenuEvent?.();
      this.attachResizeBehavior();
      this.attachCropBehavior();
      this.attachTextBehavior();
      if (this.editor.ui) this.editor.ui.initializeImgUrl = url;
      await this.makeLoadedImageSelectable(url);
      this.expandCanvasToWorkspace();
      this.editor.clearUndoStack?.();
      this.editor.clearRedoStack?.();
      this.editor.ui?.clearHistory?.();
      this.grayscaleActive = false;
      this.filterChange.emit(false);
      this.imageReady = true;
      this.documentChangesEnabled = true;
      this.ready.emit();
      this.scheduleExperimentalMinimapRefresh('full');
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

  private async applyGrayscaleToImage(): Promise<void> {
    const canvas = this.editor?._graphics?.getCanvas?.();
    const target = this.getImageProcessingTarget() ?? this.getFirstVisibleImageObject();
    if (!canvas || !target) {
      this.statusChange.emit('Add an image before applying filters.');
      return;
    }

    if (this.getImageProcessingTarget() !== target) {
      canvas.setActiveObject?.(target);
      this.applySelectionStyle(target);
      canvas.requestRenderAll?.();
    }
    await this.toggleGrayscale();
  }

  private syncFilterState(): void {
    this.grayscaleActive = Boolean(this.editor.hasFilter('Grayscale'));
    this.filterChange.emit(this.grayscaleActive);
  }
}
