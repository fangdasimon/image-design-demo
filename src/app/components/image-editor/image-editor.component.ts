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
  @Output() readonly selectedImageChange = new EventEmitter<string | null>();
  @Output() readonly documentChange = new EventEmitter<string>();

  private editor: any;
  private canvasPanCleanup?: () => void;
  private helpMenuCleanup?: () => void;
  private resizeMenuCleanup?: () => void;
  private resizeInputCleanup?: () => void;
  private cropMenuCleanup?: () => void;
  private textMenuCleanup?: () => void;
  private canvasChangeCleanup?: () => void;
  private textModeActive = false;
  private readonly textModeObjectState = new Map<any, { evented: boolean; selectable: boolean; hoverCursor: any }>();
  private readonly defaultShapeSize = 128;
  private resizeActions?: any;
  private nativeResizeActions?: any;
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
  private cropActive = false;
  private grayscaleActive = false;
  private documentChangesEnabled = false;
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
      selectionStyle: CREATION_SELECTION_STYLE
    });
    this.attachRotationBehavior();
    this.attachSelectionEvents();
    this.attachDocumentChangeEvents();
    this.attachCanvasPan();
    this.attachHelpMenuActions();
    this.attachImageProcessingBehavior();
    this.observeWorkspaceResize();
    void this.loadImageFromUrl(DEMO_ART_DATA_URL, 'Creation study');
  }

  ngOnDestroy(): void {
    this.canvasPanCleanup?.();
    this.helpMenuCleanup?.();
    this.resizeMenuCleanup?.();
    this.resizeInputCleanup?.();
    this.cropMenuCleanup?.();
    this.textMenuCleanup?.();
    this.canvasChangeCleanup?.();
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
        this.beginResizeSession(activeObject);
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
    const onCanvasChange = (): void => this.emitDocumentSnapshot();
    eventNames.forEach((eventName) => canvas.on(eventName, onCanvasChange));
    this.canvasChangeCleanup = () => eventNames.forEach((eventName) => canvas.off(eventName, onCanvasChange));
  }

  private emitDocumentSnapshot(): void {
    if (!this.documentChangesEnabled || this.cropActive) return;

    const snapshot = this.getDocumentSnapshot();
    if (!snapshot) return;
    this.documentChange.emit(snapshot);
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
      if (!isOpen) this.beginResizeSession(this.getActiveObject());
      this.editor.ui.changeMenu('resize', true, false);
      if (!isOpen) this.syncResizePanel();
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

  private attachCropBehavior(): void {
    const cropButton = this.editor.ui?._buttonElements?.crop as HTMLElement | undefined;
    const menu = cropButton?.parentElement;
    if (!cropButton || !menu || this.cropMenuCleanup) return;

    const onCropMenuClick = (): void => {
      // TUI switches drawing mode in its own click handler. Keep the crop
      // surface unselected until the user draws a crop region.
      window.setTimeout(() => {
        this.cropActive = this.editor.getDrawingMode?.() === 'CROPPER';
        if (this.cropActive) this.patchCropzoneOverlayBounds();
      });
    };

    const onOtherMenuClick = (event: MouseEvent): void => {
      const target = event.target instanceof Element
        ? event.target.closest<HTMLElement>('.tui-image-editor-item')
        : null;
      if (!target || target === cropButton || target.classList.contains('tie-btn-crop')) return;

      // TUI normally stops the cropper when changing menus, but the custom
      // canvas layout can leave its overlay visible for one render frame.
      this.exitCropMode();
    };

    cropButton.addEventListener('click', onCropMenuClick);
    menu.addEventListener('click', onOtherMenuClick, true);
    this.cropMenuCleanup = () => {
      cropButton.removeEventListener('click', onCropMenuClick);
      menu.removeEventListener('click', onOtherMenuClick, true);
    };
  }

  private exitCropMode(): void {
    if (!this.cropActive && this.editor.getDrawingMode?.() !== 'CROPPER') return;

    this.editor.stopDrawingMode?.();
    this.cropActive = false;
    this.editor._graphics?.getCanvas?.()?.requestRenderAll?.();
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

  private patchCropzoneOverlayBounds(): void {
    const graphics = this.editor?._graphics;
    const canvas = graphics?.getCanvas?.();
    const cropzone = graphics?.getComponent?.('CROPPER')?._cropzone;
    if (!canvas || !cropzone || cropzone.__creationOverlayPatched) return;

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
    cropzone.__creationOverlayPatched = true;
    canvas.requestRenderAll?.();
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
      // TUI resets the backstore using the current zoom. Restore the full
      // workspace canvas after its asynchronous resize has completed.
      window.setTimeout(() => this.expandCanvasToWorkspace());
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
    let drawingClickCandidate = false;
    let drawingPointerStart = { x: 0, y: 0 };
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
      if (drawingClickCandidate && event.e) {
        const distance = Math.hypot(event.e.clientX - drawingPointerStart.x, event.e.clientY - drawingPointerStart.y);
        if (distance > 4) drawingClickCandidate = false;
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
      const shouldUseDefaultDrawingSize = drawingClickCandidate;
      drawingClickCandidate = false;
      isPanning = false;
      canvas.defaultCursor = 'grab';
      // TUI can create a 0x0 shape when the user clicks instead of dragging.
      // Give that shape a useful starting size after TUI finishes its handler.
      window.setTimeout(() => this.normalizeClickCreatedObject(shouldUseDefaultDrawingSize));
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
        try {
          canvas.loadFromJSON(canvasJson, () => resolve());
        } catch (error) {
          reject(error);
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
