import { Component, Input } from '@angular/core';

export type CreationIconName = 'upload' | 'download' | 'map' | 'map_off' | 'image' | 'sparkle' | 'loading' | 'close';

@Component({
  selector: 'app-creation-icon',
  standalone: true,
  template: `
    <svg class="creation-svg-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      @switch (name) {
        @case ('upload') {
          <path d="M12 16V4"></path>
          <path d="m7 9 5-5 5 5"></path>
          <path d="M5 20h14"></path>
        }
        @case ('download') {
          <path d="M12 4v12"></path>
          <path d="m7 11 5 5 5-5"></path>
          <path d="M5 20h14"></path>
        }
        @case ('map') {
          <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z"></path>
          <path d="M9 3v15M15 6v15"></path>
        }
        @case ('map_off') {
          <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z"></path>
          <path d="M9 3v15M15 6v15M4 4l16 16"></path>
        }
        @case ('image') {
          <rect x="3" y="4" width="18" height="16" rx="1.5"></rect>
          <circle cx="8.5" cy="9" r="1.5"></circle>
          <path d="m3 16 5-5 4 4 3-3 6 6"></path>
        }
        @case ('sparkle') {
          <path d="m12 3-1.2 4.8L6 9l4.8 1.2L12 15l1.2-4.8L18 9l-4.8-1.2L12 3Z"></path>
          <path d="m19 15-.5 2.5L16 18l2.5.5L19 21l.5-2.5L22 18l-2.5-.5L19 15Z"></path>
        }
        @case ('loading') {
          <circle cx="12" cy="12" r="8"></circle>
          <path d="M12 4a8 8 0 0 1 8 8"></path>
        }
        @case ('close') {
          <path d="m6 6 12 12M18 6 6 18"></path>
        }
      }
    </svg>
  `,
  styles: [`
    :host { display: inline-flex; width: 1em; height: 1em; flex: 0 0 auto; color: inherit; }
    .creation-svg-icon { display: block; width: 100%; height: 100%; fill: none; stroke: currentColor; stroke-width: 1.65; stroke-linecap: round; stroke-linejoin: round; }
  `]
})
export class CreationIconComponent {
  @Input({ required: true }) name!: CreationIconName;
}
