import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { accessibleName } from '../button/accessible-name';
import { TgBadgeComponent, TgBadgeTone } from './tg-badge.component';

const TOKENS: Record<TgBadgeTone, [text: string, bg: string]> = {
  waiting: ['--tg-status-waiting-text', '--tg-status-waiting-bg'],
  confirmed: ['--tg-status-confirmed-text', '--tg-status-confirmed-bg'],
  progress: ['--tg-status-progress-text', '--tg-status-progress-bg'],
  done: ['--tg-status-done-text', '--tg-status-done-bg'],
  cancelled: ['--tg-status-cancelled-text', '--tg-status-cancelled-bg'],
  neutral: ['--tg-text-secondary', '--tg-bg-subtle'],
  accent: ['--tg-text-on-accent', '--tg-accent'],
};
const TONES = Object.keys(TOKENS) as TgBadgeTone[];

@Component({
  imports: [TgBadgeComponent],
  template: `
    <p id="item">
      Instalação de chuveiro
      <tg-badge id="status" [tone]="tone()" [icon]="icon()">Profissional a caminho</tg-badge>
    </p>
    <tg-badge id="padrao">Principal</tg-badge>
    @for (t of tones; track t) {
      <tg-badge [id]="'tom-' + t" [tone]="t">{{ t }}</tg-badge>
    }
    <div style="display:flex;width:80px"><tg-badge id="longo" tone="waiting">Aguardando sua confirmação</tg-badge></div>
  `,
})
class HostComponent {
  readonly tones = TONES;
  readonly tone = signal<TgBadgeTone>('progress');
  readonly icon = signal<'map-pin' | undefined>(undefined);
}

// Outras specs (ThemeService) deixam data-theme no <html>: cada teste fixa o
// modo e devolve o valor anterior ao terminar.
function pinTheme(theme: 'CUSTOMER' | 'PROVIDER') {
  const root = document.documentElement;
  const previous = root.getAttribute('data-theme');
  root.setAttribute('data-theme', theme);
  return () => (previous === null ? root.removeAttribute('data-theme') : root.setAttribute('data-theme', previous));
}

/** Cor do token resolvida pelo navegador, no mesmo formato do getComputedStyle. */
function tokenColor(name: string) {
  const probe = document.createElement('span');
  probe.style.color = `var(${name})`;
  document.body.appendChild(probe);
  const color = getComputedStyle(probe).color;
  probe.remove();
  return color;
}

describe('TgBadgeComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let restoreTheme: () => void;
  const el = (id: string) => fixture.nativeElement.querySelector(`#${id}`) as HTMLElement;

  beforeEach(async () => {
    restoreTheme = pinTheme('CUSTOMER');
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });
  afterEach(() => restoreTheme());

  for (const theme of ['CUSTOMER', 'PROVIDER'] as const) {
    it(`${theme}: cada tom usa o par de tokens aprovado`, () => {
      const restore = pinTheme(theme);
      try {
        for (const tone of TONES) {
          const style = getComputedStyle(el(`tom-${tone}`));
          const [text, bg] = TOKENS[tone];
          expect(style.color).withContext(`${tone} texto`).toBe(tokenColor(text));
          expect(style.backgroundColor).withContext(`${tone} fundo`).toBe(tokenColor(bg));
        }
      } finally {
        restore();
      }
    });
  }

  it('neutro é o padrão', () => {
    expect(el('padrao').classList).toContain('tg-badge--neutral');
    expect(getComputedStyle(el('padrao')).backgroundColor).toBe(tokenColor('--tg-bg-subtle'));
  });

  it('troca de tom acompanha o binding', async () => {
    host.tone.set('done');
    fixture.detectChanges();
    expect(el('status').classList).toContain('tg-badge--done');
    expect(el('status').classList).not.toContain('tg-badge--progress');
    expect(getComputedStyle(el('status')).color).toBe(tokenColor('--tg-status-done-text'));
  });

  it('anatomia: pílula de 24 px, texto de 13 px em negrito, sem caixa alta', () => {
    const style = getComputedStyle(el('padrao'));
    expect(el('padrao').getBoundingClientRect().height).toBe(24);
    expect(style.fontSize).toBe('13px');
    expect(style.fontWeight).toBe('700');
    expect(style.textTransform).toBe('none');
    expect(parseFloat(style.borderTopLeftRadius)).toBeGreaterThanOrEqual(12);
  });

  it('texto longo não quebra, não encolhe e não é cortado', () => {
    const badge = el('longo');
    expect(getComputedStyle(badge).whiteSpace).toBe('nowrap');
    expect(badge.getBoundingClientRect().height).toBe(24);
    expect(getComputedStyle(badge).textOverflow).toBe('clip');
    expect(badge.scrollWidth).toBeLessThanOrEqual(badge.getBoundingClientRect().width + 1);
  });

  describe('acessibilidade', () => {
    it('é texto comum: sem role, sem nome próprio e fora do Tab', () => {
      const badge = el('status');
      expect(badge.hasAttribute('role')).toBeFalse();
      expect(badge.hasAttribute('aria-label')).toBeFalse();
      expect(badge.hasAttribute('tabindex')).toBeFalse();
      expect(badge.tabIndex).toBe(-1);
      expect(el('item').textContent?.replace(/\s+/g, ' ').trim()).toBe('Instalação de chuveiro Profissional a caminho');
    });

    it('o ícone é decorativo e não muda o texto lido', async () => {
      host.icon.set('map-pin');
      fixture.detectChanges();
      const svg = el('status').querySelector('svg');
      expect(svg).not.toBeNull();
      expect(svg?.getAttribute('aria-hidden')).toBe('true');
      expect(el('status').querySelector('tg-icon')).toBe(el('status').firstElementChild);
      const probe = document.createElement('button');
      probe.appendChild(el('status').cloneNode(true));
      document.body.appendChild(probe);
      expect(accessibleName(probe)).toBe('Profissional a caminho');
      probe.remove();
    });

    it('sem ícone, não renderiza svg', () => {
      expect(el('status').querySelector('svg')).toBeNull();
    });

    it('sem opacidade: o contraste é o dos tokens', () => {
      for (const tone of TONES) expect(getComputedStyle(el(`tom-${tone}`)).opacity).toBe('1');
    });
  });
});
