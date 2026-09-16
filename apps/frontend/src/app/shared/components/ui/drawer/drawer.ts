import { DOCUMENT } from '@angular/common';
import {
  Component,
  ElementRef,
  inject,
  input,
  OnDestroy,
  output,
  signal,
  viewChild,
} from '@angular/core';

@Component({
  selector: 'app-drawer',
  template: `
    <dialog
      #dialog
      [attr.aria-label]="title()"
      (click)="closeOnBackdrop($event)"
      (close)="onClose()"
      (cancel)="onCancel($event)"
    >
      <header>
        <ng-content select="[drawerHeader]"
          ><h2>{{ title() }}</h2></ng-content
        >
        <button
          type="button"
          [attr.aria-label]="'Fechar ' + title()"
          [disabled]="closeDisabled()"
          (click)="requestClose()"
        >
          ✕
        </button>
      </header>
      <div class="drawer-content"><ng-content select="[drawerContent]" /></div>
      <footer class="drawer-footer"><ng-content select="[drawerFooter]" /></footer>
    </dialog>
  `,
  styleUrl: './drawer.scss',
})
export class Drawer implements OnDestroy {
  title = input('Filtros');
  readonly isOpen = signal(false);
  readonly closeDisabled = input(false);
  readonly closed = output<void>();
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly document = inject(DOCUMENT);
  private previousOverflow = '';
  private trigger: HTMLElement | null = null;

  open() {
    if (this.isOpen()) return;
    this.trigger = this.document.activeElement as HTMLElement | null;
    this.previousOverflow = this.document.body.style.overflow;
    this.dialog().nativeElement.showModal();
    this.document.body.style.overflow = 'hidden';
    this.isOpen.set(true);
  }

  requestClose() {
    if (!this.closeDisabled()) this.close();
  }

  close() {
    this.dialog().nativeElement.close();
    this.onClose();
  }

  onClose() {
    if (!this.isOpen()) return;
    this.document.body.style.overflow = this.previousOverflow;
    this.isOpen.set(false);
    this.trigger?.focus();
    this.closed.emit();
  }

  onCancel(event: Event) {
    if (this.closeDisabled()) event.preventDefault();
  }

  closeOnBackdrop(event: MouseEvent) {
    if (event.target !== this.dialog().nativeElement) return;
    const rect = this.dialog().nativeElement.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
      this.requestClose();
  }

  ngOnDestroy() {
    if (this.isOpen()) this.document.body.style.overflow = this.previousOverflow;
  }
}
