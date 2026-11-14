import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TgButtonComponent, type TgButtonAppearance } from './tg-button.component';

@Component({
  imports: [TgButtonComponent],
  template: `
    <button
      tgButton
      type="button"
      [appearance]="appearance()"
      [loading]="loading()"
      [iconStart]="iconStart()"
      (click)="clicks = clicks + 1"
    >
      Solicitar
    </button>
    <a tgButton href="#" aria-disabled="true" [loading]="loading()">Link</a>
  `,
})
class HostComponent {
  readonly appearance = signal<TgButtonAppearance>('solid');
  readonly loading = signal(false);
  readonly iconStart = signal<'arrow-right' | undefined>(undefined);
  clicks = 0;
}

describe('TgButtonComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let button: HTMLButtonElement;
  let link: HTMLAnchorElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    button = fixture.nativeElement.querySelector('button');
    link = fixture.nativeElement.querySelector('a');
  });

  it('continua sendo um button nativo, com o texto projetado', () => {
    expect(button.tagName).toBe('BUTTON');
    expect(button.textContent?.trim()).toBe('Solicitar');
    expect(button.classList).toContain('tg-button--solid');
    expect(button.classList).toContain('tg-button--md');
  });

  it('troca a classe de aparência', () => {
    host.appearance.set('outline');
    fixture.detectChanges();
    expect(button.classList).toContain('tg-button--outline');
    expect(button.classList).not.toContain('tg-button--solid');
  });

  it('carregando: bloqueia o clique, mantém o foco e anuncia', () => {
    host.loading.set(true);
    fixture.detectChanges();

    button.click();

    expect(host.clicks).toBe(0);
    expect(button.disabled).toBeFalse();
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(button.textContent).toContain('Carregando');
  });

  it('volta a aceitar clique e remove o aria-disabled que ele mesmo colocou', () => {
    host.loading.set(true);
    fixture.detectChanges();
    host.loading.set(false);
    fixture.detectChanges();

    button.click();

    expect(host.clicks).toBe(1);
    expect(button.hasAttribute('aria-disabled')).toBeFalse();
    expect(button.hasAttribute('aria-busy')).toBeFalse();
  });

  it('não apaga o aria-disabled definido pela tela', () => {
    host.loading.set(true);
    fixture.detectChanges();
    host.loading.set(false);
    fixture.detectChanges();

    expect(link.getAttribute('aria-disabled')).toBe('true');
  });

  it('renderiza o ícone como decorativo', () => {
    host.iconStart.set('arrow-right');
    fixture.detectChanges();
    const svg = button.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
  });
});
