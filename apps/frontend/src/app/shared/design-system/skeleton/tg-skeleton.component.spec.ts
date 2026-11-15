import { Component, PLATFORM_ID, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TgLoadingComponent, TgLoadingSkeletonDirective } from './tg-loading.component';
import { TgSkeletonComponent } from './tg-skeleton.component';

function pinTheme(theme: 'CUSTOMER' | 'PROVIDER') {
  const root = document.documentElement;
  const previous = root.getAttribute('data-theme');
  root.setAttribute('data-theme', theme);
  return () => (previous === null ? root.removeAttribute('data-theme') : root.setAttribute('data-theme', previous));
}

function token(name: string) {
  const probe = document.createElement('span');
  probe.style.setProperty('background-color', `var(${name})`);
  document.body.appendChild(probe);
  const value = getComputedStyle(probe).backgroundColor;
  probe.remove();
  return value;
}

@Component({
  imports: [TgSkeletonComponent],
  template: `
    <div style="width: 400px">
      <tg-skeleton id="linha" width="62%" />
      <tg-skeleton id="padrao" />
      <tg-skeleton id="paragrafo" [lines]="3" />
      <tg-skeleton id="circulo" shape="circle" size="56" />
      <tg-skeleton id="bloco" shape="rect" height="80" width="120" />
      <tg-skeleton id="chip" shape="rect" height="28" width="72" radius="full" />
      <tg-skeleton id="bloco-padrao" shape="rect" />
    </div>
  `,
})
class SkeletonHost {}

describe('TgSkeletonComponent', () => {
  let fixture: ComponentFixture<SkeletonHost>;
  const $ = (id: string) => fixture.nativeElement.querySelector(`#${id}`) as HTMLElement;
  const bones = (id: string) => Array.from($(id).querySelectorAll<HTMLElement>('.tg-skeleton__bone'));
  const box = (el: Element) => el.getBoundingClientRect();

  beforeEach(() => {
    fixture = TestBed.createComponent(SkeletonHost);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
  });
  afterEach(() => fixture.nativeElement.remove());

  it('é decorativo: aria-hidden, sem foco e sem texto', () => {
    for (const id of ['linha', 'paragrafo', 'circulo', 'bloco']) {
      expect($(id).getAttribute('aria-hidden')).toBe('true');
      expect($(id).textContent?.trim()).toBe('');
      expect($(id).querySelector('[tabindex], button, a')).toBeNull();
    }
  });

  it('texto: 14 px de altura, raio sm, largura pedida ou 100%', () => {
    expect(box(bones('linha')[0]).width).toBeCloseTo(248, 0);
    expect(box(bones('linha')[0]).height).toBe(14);
    expect(getComputedStyle(bones('linha')[0]).borderRadius).toBe('8px');
    expect(box(bones('padrao')[0]).width).toBe(400);
  });

  it('várias linhas: 10 px entre elas e a última com 64%', () => {
    const [a, b, c] = bones('paragrafo');
    expect(bones('paragrafo').length).toBe(3);
    expect(box(b).top - box(a).bottom).toBe(10);
    expect(box(a).width).toBe(400);
    expect(box(c).width).toBeCloseTo(256, 0);
  });

  it('círculo: diâmetro pedido e raio cheio', () => {
    const bone = bones('circulo')[0];
    expect(box(bone).width).toBe(56);
    expect(box(bone).height).toBe(56);
    expect(getComputedStyle(bone).borderRadius).toBe('999px');
  });

  it('bloco: medidas pedidas e raio lg; chip com raio cheio; padrão de 80 px', () => {
    expect(box(bones('bloco')[0]).width).toBe(120);
    expect(box(bones('bloco')[0]).height).toBe(80);
    expect(getComputedStyle(bones('bloco')[0]).borderRadius).toBe('16px');
    expect(getComputedStyle(bones('chip')[0]).borderRadius).toBe('999px');
    expect(box(bones('bloco-padrao')[0]).height).toBe(80);
    expect(box(bones('bloco-padrao')[0]).width).toBe(400);
  });

  it('cor border-default nos dois modos, com pulso de 1,6 s', () => {
    for (const theme of ['CUSTOMER', 'PROVIDER'] as const) {
      const restore = pinTheme(theme);
      try {
        const bone = bones('linha')[0];
        expect(getComputedStyle(bone).backgroundColor).toBe(token('--tg-border-default'));
        expect(getComputedStyle(bone).animationDuration).toBe('1.6s');
        expect(getComputedStyle(bone).animationIterationCount).toBe('infinite');
      } finally {
        restore();
      }
    }
  });

  it('com movimento reduzido, a regra tira a animação', () => {
    const rules = Array.from(document.styleSheets).flatMap((sheet) => {
      try {
        return Array.from(sheet.cssRules);
      } catch {
        return [];
      }
    });
    const reduced = rules.filter(
      (r): r is CSSMediaRule => r instanceof CSSMediaRule && r.conditionText.includes('prefers-reduced-motion: reduce'),
    );
    const off = reduced.some((m) =>
      Array.from(m.cssRules).some((r) => r instanceof CSSStyleRule && r.selectorText.includes('tg-skeleton__bone') && r.style.animationName === 'none'),
    );
    expect(off).toBeTrue();
  });
});

@Component({
  imports: [TgLoadingComponent, TgLoadingSkeletonDirective, TgSkeletonComponent],
  template: `
    <tg-loading label="Carregando pedidos" [loading]="loading()" [delay]="delay()">
      <ng-template tgLoadingSkeleton><tg-skeleton id="osso" [lines]="2" /></ng-template>
      <ul id="conteudo"><li>Instalação de chuveiro</li></ul>
    </tg-loading>
  `,
})
class LoadingHost {
  readonly loading = signal(true);
  readonly delay = signal(300);
}

describe('TgLoadingComponent', () => {
  let fixture: ComponentFixture<LoadingHost>;
  const $ = (selector: string) => fixture.nativeElement.querySelector(selector) as HTMLElement | null;
  const status = () => $('[role=status]') as HTMLElement;
  const body = () => $('.tg-loading__body') as HTMLElement;
  const tick = (ms: number) => {
    jasmine.clock().tick(ms);
    fixture.detectChanges();
  };

  beforeEach(() => {
    jasmine.clock().install();
    fixture = TestBed.createComponent(LoadingHost);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
  });
  afterEach(() => {
    fixture.destroy();
    fixture.nativeElement.remove();
    jasmine.clock().uninstall();
  });

  it('carregando: corpo ocupado; nada aparece nem é anunciado antes de 300 ms', () => {
    expect(body().getAttribute('aria-busy')).toBe('true');
    expect($('#osso')).toBeNull();
    expect($('#conteudo')).toBeNull();
    tick(299);
    expect($('#osso')).toBeNull();
    expect(status().textContent?.trim()).toBe('');
  });

  it('depois de 300 ms: mostra o skeleton e anuncia o rótulo uma vez', () => {
    tick(300);
    expect($('#osso')).not.toBeNull();
    expect($('.tg-loading__skeleton')?.getAttribute('aria-hidden')).toBe('true');
    expect(status().textContent?.trim()).toBe('Carregando pedidos');
    tick(5000);
    expect(fixture.nativeElement.querySelectorAll('#osso').length).toBe(1);
  });

  it('a região viva fica fora do aria-busy', () => {
    expect(status().closest('[aria-busy]')).toBeNull();
    expect(getComputedStyle(status()).position).toBe('absolute');
    expect(status().getBoundingClientRect().width).toBeLessThanOrEqual(1);
  });

  it('dados antes de 300 ms: vai direto ao conteúdo, sem piscar o skeleton', () => {
    tick(200);
    fixture.componentInstance.loading.set(false);
    fixture.detectChanges();
    tick(1000);
    expect($('#osso')).toBeNull();
    expect($('#conteudo')).not.toBeNull();
    expect(body().hasAttribute('aria-busy')).toBeFalse();
    expect(status().textContent?.trim()).toBe('');
  });

  it('dados depois do skeleton: troca pelo conteúdo e limpa o anúncio', () => {
    tick(300);
    fixture.componentInstance.loading.set(false);
    fixture.detectChanges();
    expect($('#osso')).toBeNull();
    expect($('#conteudo')?.textContent).toContain('Instalação de chuveiro');
    expect(status().textContent?.trim()).toBe('');
  });

  it('recarregar: espera de novo os 300 ms', () => {
    tick(300);
    fixture.componentInstance.loading.set(false);
    fixture.detectChanges();
    fixture.componentInstance.loading.set(true);
    fixture.detectChanges();
    expect($('#osso')).toBeNull();
    tick(300);
    expect($('#osso')).not.toBeNull();
  });

  it('delay 0 mostra logo', () => {
    fixture.componentInstance.delay.set(0);
    fixture.detectChanges();
    expect($('#osso')).not.toBeNull();
  });

  it('sair da tela carregando não deixa tempo pendente', () => {
    const loading = fixture.debugElement.children[0].componentInstance as TgLoadingComponent;
    fixture.destroy();
    expect(() => jasmine.clock().tick(1000)).not.toThrow();
    expect((loading as unknown as { showSkeleton: () => boolean }).showSkeleton()).toBeFalse();
  });
});

describe('TgLoadingComponent no servidor', () => {
  it('não agenda tempo nem mostra skeleton', () => {
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
    const spy = spyOn(window, 'setTimeout').and.callThrough();
    const fixture = TestBed.createComponent(LoadingHost);
    fixture.detectChanges();
    expect(spy.calls.all().some((c) => c.args[1] === 300)).toBeFalse();
    expect(fixture.nativeElement.querySelector('#osso')).toBeNull();
    expect(fixture.nativeElement.querySelector('.tg-loading__body').getAttribute('aria-busy')).toBe('true');
    fixture.destroy();
  });
});
