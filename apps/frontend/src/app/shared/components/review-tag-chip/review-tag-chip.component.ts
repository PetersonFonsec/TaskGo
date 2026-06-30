import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-review-tag-chip',
  template: `<button type="button" [class.selected]="selected()" [attr.aria-pressed]="selected()" (click)="selectedChange.emit(!selected())"><span>{{ selected() ? '✓' : '+' }}</span>{{ label() }}</button>`,
  styles: [`:host{display:inline-flex}button{align-items:center;background:#fff;border:1px solid #dbe3ee;border-radius:999px;color:#475569;cursor:pointer;display:flex;font:inherit;font-size:12px;font-weight:700;gap:6px;padding:9px 13px;transition:.15s}button:hover{border-color:#a78bfa;color:#6d28d9}button.selected{background:#f3e8ff;border-color:#c4b5fd;color:#6d28d9}span{font-size:13px;font-weight:900}`],
})
export class ReviewTagChipComponent {
  label = input.required<string>();
  selected = input(false);
  selectedChange = output<boolean>();
}
