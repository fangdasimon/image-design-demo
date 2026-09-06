import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

export type PropertyAction = 'reset' | 'rotate' | 'grayscale' | 'export';

@Component({
  selector: 'app-properties-panel',
  standalone: true,
  imports: [MatButtonModule, MatDividerModule, MatIconModule, MatTooltipModule],
  template: `
    <div class="panel-title-row">
      <div>
        <span class="section-label">Editor</span>
        <h2>Edit image</h2>
      </div>
      <span class="ready-mark" [class.ready]="imageReady"><span></span>{{ imageReady ? 'Ready' : 'Empty' }}</span>
    </div>
    <p class="panel-intro">Quick changes stay visible on the canvas.</p>
    <div class="panel-section">
      <div class="section-heading"><span class="section-label">Quick edits</span><span class="section-index">02</span></div>
      <div class="quick-actions">
        <button class="property-action" mat-stroked-button [class.is-active]="grayscaleActive" [disabled]="!imageReady" [attr.aria-pressed]="grayscaleActive" (click)="action.emit('grayscale')">
          <span class="action-icon"><mat-icon fontSet="material-symbols-outlined" data-icon="tonality">tonality</mat-icon></span>
          <span class="action-copy"><strong>Grayscale</strong><small>{{ grayscaleActive ? 'On' : 'Off' }}</small></span>
        </button>
        <button class="property-action" mat-stroked-button [disabled]="!imageReady" (click)="action.emit('rotate')">
          <span class="action-icon"><mat-icon fontSet="material-symbols-outlined" data-icon="rotate_right">rotate_right</mat-icon></span>
          <span class="action-copy"><strong>Rotate</strong><small>90° clockwise</small></span>
        </button>
      </div>
    </div>
    <div class="canvas-status">
      <span>Canvas</span>
      <strong>{{ imageReady ? 'Ready to edit' : 'Upload an image to begin' }}</strong>
    </div>
    <div class="panel-actions">
      <button class="reset-button" mat-stroked-button [disabled]="!imageReady" (click)="action.emit('reset')"><mat-icon fontSet="material-symbols-outlined" data-icon="restart_alt">restart_alt</mat-icon><span>Reset</span></button>
      <button class="export-button" mat-flat-button [disabled]="!imageReady" (click)="action.emit('export')"><mat-icon fontSet="material-symbols-outlined" data-icon="download">download</mat-icon><span>Export</span></button>
    </div>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; gap: 20px; height: 100%; }
    .panel-title-row { display: flex; align-items: flex-start; justify-content: space-between; }
    .section-label { color: var(--muted); display: block; font-size: 11px; font-weight: 120; letter-spacing: .03em; }
    h2 { margin: 7px 0 0; color: var(--ink); font-size: 23px; font-weight: 120; line-height: 1.05; }
    .ready-mark { display: inline-flex; align-items: center; gap: 5px; border: 1px solid var(--line); color: var(--muted); font-size: 10px; padding: 5px 8px; }
    .ready-mark span { width: 6px; height: 6px; border-radius: 50%; background: var(--line-strong); }
    .ready-mark.ready { border-color: var(--ink); color: var(--ink); }
    .ready-mark.ready span { background: var(--ink); }
    .panel-intro { max-width: 240px; margin: -5px 0 0; color: var(--muted); font-size: 12px; line-height: 1.5; }
    .panel-section { display: grid; gap: 10px; }
    .section-heading { display: flex; align-items: center; justify-content: space-between; margin-bottom: 3px; }
    .section-index { color: var(--muted); font-size: 11px; }
    .quick-actions { display: grid; gap: 8px; }
    .property-action { min-height: 58px; display: flex; align-items: center; gap: 10px; border-color: var(--line); border-radius: 0; color: var(--ink); font-size: 12px; padding: 8px 10px; text-align: left; }
    .property-action:hover:not([disabled]), .property-action.is-active { border-color: var(--ink); background: var(--primary-grey); }
    .action-icon { display: grid; place-items: center; width: 30px; height: 30px; flex: 0 0 auto; background: var(--ink); color: var(--paper); }
    .action-icon mat-icon { --creation-icon-size: 18px; width: 18px; height: 18px; font-size: 18px; }
    .action-copy { display: grid; gap: 3px; }
    .action-copy strong { font-size: 12px; font-weight: 120; }
    .action-copy small { color: var(--muted); font-size: 10px; }
    .canvas-status { display: flex; justify-content: space-between; gap: 12px; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); padding: 13px 0; color: var(--muted); font-size: 11px; }
    .canvas-status strong { color: var(--ink); font-size: 11px; font-weight: 80; text-align: right; }
    .panel-actions { display: grid; grid-template-columns: .75fr 1.25fr; gap: 8px; margin-top: auto; }
    .reset-button, .export-button { min-height: 42px; border-radius: 0; font-size: 11px; }
    .reset-button { border-color: var(--line-strong); color: var(--ink); }
    .reset-button mat-icon, .export-button mat-icon { --creation-icon-size: 17px; margin-right: 6px; font-size: 17px; }
    .export-button { background: var(--ink); color: var(--paper); }
    .export-button:hover:not([disabled]) { background: #272727; }
  `]
})
export class PropertiesPanelComponent {
  @Input() imageReady = false;
  @Input() grayscaleActive = false;
  @Output() readonly action = new EventEmitter<PropertyAction>();
}
