import { Component, OnDestroy, OnInit, PLATFORM_ID, signal } from '@angular/core';
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

  it('delay 0 mostra logo (na próxima carga, se mudou no meio desta)', () => {
    fixture.componentInstance.delay.set(0);
    fixture.detectChanges();
    expect($('#osso')).toBeNull();
    fixture.componentInstance.loading.set(false);
    fixture.detectChanges();
    fixture.componentInstance.loading.set(true);
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

// ---------------------------------------------------------------------------
// Revisão do PR #20
// ---------------------------------------------------------------------------

@Component({
  imports: [TgSkeletonComponent],
  template: `
    <div style="width: 400px">
      <tg-skeleton id="alvo" [shape]="shape()" [lines]="lines()" [size]="size()" [width]="width()" [height]="height()" />
    </div>
  `,
})
class InputsHost {
  readonly shape = signal<'text' | 'circle' | 'rect'>('text');
  readonly lines = signal<number>(1);
  readonly size = signal<number>(48);
  readonly width = signal<string | number | undefined>(undefined);
  readonly height = signal<string | number | undefined>(undefined);
}

describe('TgSkeletonComponent: entradas inválidas', () => {
  let fixture: ComponentFixture<InputsHost>;
  const host = () => fixture.componentInstance;
  const el = () => fixture.nativeElement.querySelector('#alvo') as HTMLElement;
  const bones = () => Array.from(el().querySelectorAll<HTMLElement>('.tg-skeleton__bone'));
  const render = () => fixture.detectChanges();

  beforeEach(() => {
    fixture = TestBed.createComponent(InputsHost);
    document.body.appendChild(fixture.nativeElement);
    render();
  });
  afterEach(() => fixture.nativeElement.remove());

  it('lines=1 e lines=3 (última com 64%)', () => {
    expect(bones().length).toBe(1);
    host().lines.set(3);
    render();
    expect(bones().length).toBe(3);
    expect(bones()[2].style.width).toBe('64%');
  });

  for (const [name, value] of [['0', 0], ['-1', -1], ['NaN', NaN], ['Infinity', Infinity], ['-Infinity', -Infinity]] as const) {
    it(`lines=${name}: uma linha, sem erro`, () => {
      host().lines.set(value);
      expect(() => render()).not.toThrow();
      expect(bones().length).toBe(1);
    });
  }

  it('lines=1000000: limitado a 20 linhas', () => {
    host().lines.set(1_000_000);
    render();
    expect(bones().length).toBe(20);
    expect(bones()[19].style.width).toBe('64%');
  });

  it('lines fracionário arredonda para baixo', () => {
    host().lines.set(2.7);
    render();
    expect(bones().length).toBe(2);
  });

  for (const [name, value] of [['-20', -20], ['NaN', NaN], ['Infinity', Infinity], ['0', 0]] as const) {
    it(`size=${name}: volta ao padrão de 48 px`, () => {
      host().shape.set('circle');
      host().size.set(value);
      render();
      const box = bones()[0].getBoundingClientRect();
      expect(box.width).toBe(48);
      expect(box.height).toBe(48);
    });
  }

  it('width e height negativos ou NaN: voltam ao padrão', () => {
    host().shape.set('rect');
    for (const bad of [-120, NaN, '-120', Infinity]) {
      host().width.set(bad);
      host().height.set(bad);
      render();
      const box = bones()[0].getBoundingClientRect();
      expect(box.width).withContext(String(bad)).toBe(400);
      expect(box.height).withContext(String(bad)).toBe(80);
    }
  });

  it('valores CSS válidos continuam: %, px, rem e número', () => {
    host().shape.set('rect');
    const cases: [string | number, number][] = [['62%', 248], ['120px', 120], ['5rem', 80], [96, 96], ['96', 96]];
    for (const [value, px] of cases) {
      host().width.set(value);
      host().height.set(value === '62%' ? 40 : value);
      render();
      expect(bones()[0].getBoundingClientRect().width).withContext(String(value)).toBeCloseTo(px, 0);
    }
  });

  it('as três formas continuam', () => {
    for (const shape of ['text', 'circle', 'rect'] as const) {
      host().shape.set(shape);
      render();
      expect(el().classList).toContain(`tg-skeleton--${shape}`);
      expect(bones().length).toBe(1);
    }
  });

  it('não tem nada focável', () => {
    host().lines.set(5);
    render();
    expect(el().querySelectorAll('a, button, input, [tabindex]').length).toBe(0);
  });
});

@Component({
  imports: [TgLoadingComponent, TgLoadingSkeletonDirective, TgSkeletonComponent],
  template: `
    <tg-loading id="a" [label]="label()" [loading]="loading()" [delay]="delay()">
      <ng-template tgLoadingSkeleton><tg-skeleton class="osso" /></ng-template>
      <p class="conteudo">Pronto</p>
    </tg-loading>
  `,
})
class RaceHost {
  readonly loading = signal(true);
  readonly delay = signal(300);
  readonly label = signal('Carregando pedidos');
}

describe('TgLoadingComponent: tempo', () => {
  let fixture: ComponentFixture<RaceHost>;
  const host = () => fixture.componentInstance;
  const skeleton = () => fixture.nativeElement.querySelector('.osso') as HTMLElement | null;
  const status = () => fixture.nativeElement.querySelector('[role=status]') as HTMLElement;
  const render = () => fixture.detectChanges();
  const tick = (ms: number) => {
    jasmine.clock().tick(ms);
    render();
  };

  beforeEach(() => {
    jasmine.clock().install();
    fixture = TestBed.createComponent(RaceHost);
    document.body.appendChild(fixture.nativeElement);
    render();
  });
  afterEach(() => {
    fixture.destroy();
    fixture.nativeElement.remove();
    jasmine.clock().uninstall();
  });

  it('299 ms: ausente; 300 ms: visível', () => {
    tick(299);
    expect(skeleton()).toBeNull();
    tick(1);
    expect(skeleton()).not.toBeNull();
  });

  it('true → false antes de 300 ms: o skeleton nunca aparece', () => {
    tick(150);
    host().loading.set(false);
    render();
    for (let i = 0; i < 10; i++) {
      tick(100);
      expect(skeleton()).toBeNull();
    }
  });

  it('true → false → true: o novo carregamento espera os 300 ms dele', () => {
    tick(250);
    host().loading.set(false);
    render();
    host().loading.set(true);
    render();
    tick(299);
    expect(skeleton()).toBeNull();
    tick(1);
    expect(skeleton()).not.toBeNull();
  });

  it('alternância no vencimento, antes da tela atualizar: o tempo antigo não vale para a nova carga', () => {
    tick(299);
    host().loading.set(false); // ainda sem detectChanges: o efeito não rodou
    jasmine.clock().tick(1); // o tempo antigo vence aqui
    host().loading.set(true);
    render();
    expect(skeleton()).toBeNull();
    tick(299);
    expect(skeleton()).toBeNull();
    tick(1);
    expect(skeleton()).not.toBeNull();
  });

  it('tempo antigo vencendo depois de voltar a carregar, sem atualizar a tela: não mostra cedo', () => {
    tick(100);
    host().loading.set(false);
    host().loading.set(true); // sem detectChanges entre as trocas
    jasmine.clock().tick(200); // vence o tempo da carga anterior
    render();
    // O sinal mudou e voltou: é a mesma carga para o Angular. Segue o tempo de 300 ms.
    expect(skeleton()).not.toBeNull();
  });

  it('delay alterado durante a carga vale só para a próxima', () => {
    tick(100);
    host().delay.set(1000);
    render();
    tick(200);
    expect(skeleton()).not.toBeNull();
    host().loading.set(false);
    render();
    host().loading.set(true);
    render();
    tick(999);
    expect(skeleton()).toBeNull();
    tick(1);
    expect(skeleton()).not.toBeNull();
  });

  it('delay alterado com o skeleton já na tela não o esconde', () => {
    tick(300);
    host().delay.set(5000);
    render();
    expect(skeleton()).not.toBeNull();
  });

  it('delay=0: imediato no navegador', () => {
    host().loading.set(false);
    render();
    host().delay.set(0);
    host().loading.set(true);
    render();
    expect(skeleton()).not.toBeNull();
  });

  it('destruir com tempo pendente: nada é agendado depois e nenhum callback roda', () => {
    const cmp = fixture.debugElement.children[0].componentInstance as TgLoadingComponent;
    tick(100);
    fixture.destroy();
    jasmine.clock().tick(1000);
    expect((cmp as unknown as { showSkeleton: () => boolean }).showSkeleton()).toBeFalse();
  });

  it('label muda durante o carregamento: o anúncio acompanha', () => {
    tick(300);
    expect(status().textContent?.trim()).toBe('Carregando pedidos');
    host().label.set('Carregando endereços');
    render();
    expect(status().textContent?.trim()).toBe('Carregando endereços');
  });

  it('aria-busy durante e depois; role=status fora da região ocupada', () => {
    const body = fixture.nativeElement.querySelector('.tg-loading__body') as HTMLElement;
    expect(body.getAttribute('aria-busy')).toBe('true');
    expect(status().closest('[aria-busy]')).toBeNull();
    host().loading.set(false);
    render();
    expect(body.hasAttribute('aria-busy')).toBeFalse();
  });
});

@Component({
  imports: [TgLoadingComponent],
  template: `
    <tg-loading label="Carregando" [loading]="loading()"><p class="conteudo">Pronto</p></tg-loading>
  `,
})
class NoSkeletonHost {
  readonly loading = signal(true);
}

describe('TgLoadingComponent sem tgLoadingSkeleton', () => {
  beforeEach(() => jasmine.clock().install());
  afterEach(() => jasmine.clock().uninstall());

  it('anuncia e fica ocupado, sem erro; depois mostra o conteúdo', () => {
    const fixture = TestBed.createComponent(NoSkeletonHost);
    fixture.detectChanges();
    jasmine.clock().tick(300);
    expect(() => fixture.detectChanges()).not.toThrow();
    expect(fixture.nativeElement.querySelector('[role=status]').textContent.trim()).toBe('Carregando');
    expect(fixture.nativeElement.querySelector('.conteudo')).toBeNull();
    fixture.componentInstance.loading.set(false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.conteudo')).not.toBeNull();
    fixture.destroy();
  });
});

@Component({
  imports: [TgLoadingComponent, TgLoadingSkeletonDirective, TgSkeletonComponent],
  template: `
    <tg-loading id="um" label="Carregando um" [loading]="um()"><ng-template tgLoadingSkeleton><tg-skeleton /></ng-template>Um</tg-loading>
    <tg-loading id="dois" label="Carregando dois" [loading]="dois()" [delay]="600"><ng-template tgLoadingSkeleton><tg-skeleton /></ng-template>Dois</tg-loading>
  `,
})
class TwoHost {
  readonly um = signal(true);
  readonly dois = signal(true);
}

describe('TgLoadingComponent: instâncias independentes', () => {
  beforeEach(() => jasmine.clock().install());
  afterEach(() => jasmine.clock().uninstall());

  it('cada uma com o próprio tempo e estado', () => {
    const fixture = TestBed.createComponent(TwoHost);
    const sk = (id: string) => fixture.nativeElement.querySelector(`#${id} tg-skeleton`);
    fixture.detectChanges();
    jasmine.clock().tick(300);
    fixture.detectChanges();
    expect(sk('um')).not.toBeNull();
    expect(sk('dois')).toBeNull();
    fixture.componentInstance.um.set(false);
    fixture.detectChanges();
    jasmine.clock().tick(300);
    fixture.detectChanges();
    expect(sk('um')).toBeNull();
    expect(sk('dois')).not.toBeNull();
    fixture.destroy();
  });
});

let childLog: string[] = [];

@Component({ selector: 'tg-test-child', template: `<button class="filho">Ver pedido</button>` })
class ChildProbe implements OnInit, OnDestroy {
  ngOnInit() {
    childLog.push('init');
  }
  ngOnDestroy() {
    childLog.push('destroy');
  }
}

@Component({
  imports: [TgLoadingComponent, TgLoadingSkeletonDirective, TgSkeletonComponent, ChildProbe],
  template: `
    @if (shown()) {
      <tg-loading label="Carregando" [loading]="loading()" [delay]="0">
        <ng-template tgLoadingSkeleton><tg-skeleton /></ng-template>
        <tg-test-child />
      </tg-loading>
    }
  `,
})
class ProjectionHost {
  readonly loading = signal(true);
  readonly shown = signal(true);
}

describe('TgLoadingComponent: conteúdo projetado', () => {
  let fixture: ComponentFixture<ProjectionHost>;
  const button = () => fixture.nativeElement.querySelector('.filho') as HTMLButtonElement | null;

  beforeEach(() => {
    childLog = [];
    fixture = TestBed.createComponent(ProjectionHost);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
  });
  afterEach(() => {
    fixture.destroy();
    fixture.nativeElement.remove();
  });

  it('o filho é criado com a tela, mesmo carregando, mas fica fora do DOM', () => {
    expect(childLog).toEqual(['init']);
    expect(button()).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('button, a, input, [tabindex]').length).toBe(0);
  });

  it('alternar carregando e pronto não recria o filho; o conteúdo aparece e recebe foco', () => {
    fixture.componentInstance.loading.set(false);
    fixture.detectChanges();
    expect(button()).not.toBeNull();
    button()?.focus();
    expect(document.activeElement).toBe(button());
    fixture.componentInstance.loading.set(true);
    fixture.detectChanges();
    expect(button()).toBeNull();
    fixture.componentInstance.loading.set(false);
    fixture.detectChanges();
    expect(button()).not.toBeNull();
    expect(childLog).toEqual(['init']);
  });

  it('o filho é destruído junto com o pai', () => {
    fixture.componentInstance.shown.set(false);
    fixture.detectChanges();
    expect(childLog).toEqual(['init', 'destroy']);
  });
});
