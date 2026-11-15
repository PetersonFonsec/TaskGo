import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TgButtonComponent } from '../button/tg-button.component';
import { accessibleName } from '../button/accessible-name';
import { TgAlertComponent, TgFeedbackTone } from './tg-alert.component';

function pinTheme(theme: 'CUSTOMER' | 'PROVIDER' = 'CUSTOMER') {
  const root = document.documentElement;
  const previous = root.getAttribute('data-theme');
  root.setAttribute('data-theme', theme);
  return () => (previous === null ? root.removeAttribute('data-theme') : root.setAttribute('data-theme', previous));
}

function token(name: string, property = 'color') {
  const probe = document.createElement('span');
  probe.style.setProperty(property, `var(${name})`);
  document.body.appendChild(probe);
  const value = getComputedStyle(probe).getPropertyValue(property);
  probe.remove();
  return value;
}

@Component({
  imports: [TgAlertComponent, TgButtonComponent],
  template: `
    <tg-alert id="erro" tone="danger" title="Não foi possível carregar seus pedidos">
      Verifique sua conexão e tente de novo.
      <button tgButton tgAlertAction id="tentar" appearance="outline" size="sm">Tentar de novo</button>
    </tg-alert>
    @for (tone of tones; track tone) {
      <tg-alert [id]="'tom-' + tone" [tone]="tone">Texto do aviso.</tg-alert>
    }
    <tg-alert id="info" dismissible (closed)="closed = closed + 1">Seu endereço é usado só para o profissional chegar.</tg-alert>
    <button id="depois">Continuar</button>
    <tg-alert id="padrao">Sem tom.</tg-alert>
  `,
})
class HostComponent {
  readonly tones: TgFeedbackTone[] = ['info', 'success', 'warning', 'danger'];
  closed = 0;
}

describe('TgAlertComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let restoreTheme: () => void;
  const $ = <T extends HTMLElement>(selector: string) => fixture.nativeElement.querySelector(selector) as T;

  beforeEach(() => (restoreTheme = pinTheme()));
  afterEach(() => restoreTheme());
  beforeEach(async () => {
    fixture = TestBed.createComponent(HostComponent);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    await fixture.whenStable();
  });
  afterEach(() => fixture.nativeElement.remove());

  it('erro é role=alert; os demais, role=status', () => {
    expect($('#tom-danger').getAttribute('role')).toBe('alert');
    for (const tone of ['info', 'success', 'warning']) expect($(`#tom-${tone}`).getAttribute('role')).toBe('status');
    expect($('#padrao').classList).toContain('tg-alert--info');
  });

  it('título, texto e ação; ícone decorativo', () => {
    const alert = $('#erro');
    expect(alert.querySelector('.tg-alert__title')?.textContent?.trim()).toBe('Não foi possível carregar seus pedidos');
    expect(alert.querySelector('.tg-alert__text')?.textContent?.trim()).toBe('Verifique sua conexão e tente de novo.');
    expect(alert.querySelector('.tg-alert__actions #tentar')).not.toBeNull();
    expect(alert.querySelector('tg-icon svg')?.getAttribute('aria-hidden')).toBe('true');
    expect($('#tom-info .tg-alert__actions').getBoundingClientRect().height).toBe(0);
  });

  it('cores dos pares de feedback, nos dois modos, sem opacidade', () => {
    for (const theme of ['CUSTOMER', 'PROVIDER'] as const) {
      const restore = pinTheme(theme);
      try {
        for (const tone of ['info', 'success', 'warning', 'danger']) {
          const alert = $(`#tom-${tone}`);
          expect(getComputedStyle(alert).backgroundColor).toBe(token(`--tg-feedback-${tone}-bg`, 'background-color'));
          expect(getComputedStyle(alert).color).toBe(token('--tg-text-primary'));
          expect(getComputedStyle(alert.querySelector('.tg-alert__icon') as HTMLElement).color).toBe(token(`--tg-feedback-${tone}-text`));
          expect(getComputedStyle(alert).opacity).toBe('1');
        }
      } finally {
        restore();
      }
    }
  });

  it('sem dismissible, sem botão de fechar', () => {
    expect($('#erro .tg-alert__close')).toBeNull();
  });

  it('fechar: botão de 44 px com nome, esconde, avisa e passa o foco adiante', async () => {
    const close = $<HTMLButtonElement>('#info .tg-alert__close');
    expect(accessibleName(close)).toBe('Fechar aviso');
    expect(close.type).toBe('button');
    expect(close.getBoundingClientRect().width).toBe(44);
    expect(close.getBoundingClientRect().height).toBe(44);
    close.focus();
    close.click();
    fixture.detectChanges();
    expect($('#info').hidden).toBeTrue();
    expect(getComputedStyle($('#info')).display).toBe('none');
    expect(fixture.componentInstance.closed).toBe(1);
    expect(document.activeElement).toBe($('#depois'));
  });

  it('fechar sem foco nele não mexe no foco', () => {
    $<HTMLButtonElement>('#tentar').focus();
    const cmp = fixture.debugElement.query((d) => d.nativeElement.id === 'info').componentInstance as TgAlertComponent;
    cmp.dismiss();
    expect(document.activeElement).toBe($('#tentar'));
  });
});
