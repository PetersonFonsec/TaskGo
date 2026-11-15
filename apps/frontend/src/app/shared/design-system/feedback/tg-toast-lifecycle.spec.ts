import { Component, afterRenderEffect, effect, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TgToastRegionComponent } from './tg-toast-region.component';
import { TgToast } from './tg-toast.service';

@Component({
  imports: [TgToastRegionComponent],
  template: '<button id="outside">Fora</button><tg-toast-region />',
})
class LifecycleHost {}

@Component({ template: '<span>{{ value() }}</span>' })
class RenderOrderProbe {
  readonly value = signal(0);
  readonly trace: string[] = [];
  constructor() {
    effect(() => this.trace.push(`effect:${this.value()}`));
    afterRenderEffect(() => this.trace.push(`afterRender:${this.value()}`));
  }
}

describe('TgToast: ciclo de renderização e temporizadores', () => {
  let fixture: ComponentFixture<LifecycleHost>;
  let toast: TgToast;
  let active: Map<number, number>;
  let schedule: jasmine.Spy;
  const box = () => fixture.nativeElement.querySelector('.tg-toast') as HTMLElement | null;
  const render = () => fixture.detectChanges();
  const tick = (ms: number) => { jasmine.clock().tick(ms); render(); };
  const show = (message: string, action = false) => toast.show(message, action ? { action: 'Desfazer' } : {});
  const expiresIn = (duration: number) => {
    expect(active.size).toBe(1);
    tick(duration - 1);
    expect(box()).not.toBeNull();
    tick(1);
    expect(toast.current()).toBeNull();
    expect(box()).toBeNull();
    expect(active.size).toBe(0);
  };

  beforeEach(() => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date(2026, 10, 15));
    active = new Map();
    const nativeSet = window.setTimeout;
    const nativeClear = window.clearTimeout;
    // Só os timers longos de toast; não inclui o agendamento interno de frames Angular.
    schedule = jasmine.createSpy('setTimeout').and.callFake((handler: TimerHandler, delay = 0, ...args: unknown[]) => {
      if (typeof handler !== 'function' || delay < 1000) return nativeSet(handler, delay, ...args);
      const timer = nativeSet(() => { active.delete(timer); handler(...args); }, delay);
      active.set(timer, delay);
      return timer;
    });
    window.setTimeout = Object.assign(schedule, nativeSet);
    window.clearTimeout = jasmine.createSpy('clearTimeout').and.callFake((timer: number) => {
      active.delete(timer);
      nativeClear(timer);
    });
    fixture = TestBed.createComponent(LifecycleHost);
    toast = TestBed.inject(TgToast);
    document.body.append(fixture.nativeElement);
    render();
  });
  afterEach(() => {
    fixture.destroy();
    fixture.nativeElement.remove();
    jasmine.clock().uninstall();
  });

  it('executa effect antes de afterRenderEffect também após atualizações coalescidas', () => {
    const probe = TestBed.createComponent(RenderOrderProbe);
    try {
      probe.detectChanges();
      expect(probe.componentInstance.trace).toEqual(['effect:0', 'afterRender:0']);
      probe.componentInstance.trace.length = 0;
      probe.componentInstance.value.set(1);
      probe.componentInstance.value.set(2);
      probe.detectChanges();
      expect(probe.componentInstance.trace).toEqual(['effect:2', 'afterRender:2']);
      expect(probe.nativeElement.textContent).toBe('2');
    } finally { probe.destroy(); }
  });

  for (const firstAction of [false, true]) for (const nextAction of [false, true]) {
    it(`substitui ação=${firstAction} por ação=${nextAction} com timer único e duração integral`, () => {
      show('Primeiro', firstAction); render(); tick(3000);
      show('Último', nextAction); render();
      expect(box()?.textContent).toContain('Último');
      expiresIn(nextAction ? 10000 : 6000);
    });
  }

  it('múltiplas substituições no mesmo ciclo agendam só o último toast', () => {
    show('Inicial'); render(); tick(4000);
    show('Intermediário', true); show('Outro'); show('Último', true); render();
    expect(schedule.calls.all().filter((call) => call.args[1] >= 6000).length).toBe(2);
    expect(box()?.textContent).toContain('Último');
    expiresIn(10000);
  });

  it('ciclos consecutivos sem passagem de tempo não deixam timers órfãos', () => {
    for (let i = 0; i < 8; i++) {
      show(`Toast ${i}`, i % 2 === 0); render();
      expect(active.size).toBe(1);
    }
    expiresIn(6000);
  });

  it('substituição durante hover pausa legitimamente e depois expira', () => {
    show('Inicial'); render(); tick(4000);
    spyOn(box()!, 'matches').and.returnValue(true);
    box()!.dispatchEvent(new MouseEvent('mouseenter'));
    show('Último'); render();
    expect(active.size).toBe(0);
    tick(30000); expect(box()).not.toBeNull();
    box()!.dispatchEvent(new MouseEvent('mouseleave'));
    expiresIn(6000);
  });

  it('substituição durante foco pausa e a perda de foco inicia o tempo integral', () => {
    show('Inicial'); render();
    (box()!.querySelector('button') as HTMLElement).focus();
    show('Último', true); render();
    expect(box()!.contains(document.activeElement)).toBeTrue();
    expect(active.size).toBe(0);
    tick(30000); expect(box()).not.toBeNull();
    (fixture.nativeElement.querySelector('#outside') as HTMLElement).focus();
    expiresIn(10000);
  });

  it('retomada usa o restante e substituição posterior usa a nova duração', () => {
    show('Inicial'); render(); tick(3000);
    box()!.dispatchEvent(new MouseEvent('mouseenter'));
    tick(20000); expect(active.size).toBe(0);
    box()!.dispatchEvent(new MouseEvent('mouseleave'));
    expect(Array.from(active.values())).toEqual([3000]);
    tick(1000);
    show('Último'); render();
    expiresIn(6000);
  });

  it('substituição imediatamente antes da expiração invalida o timer antigo', () => {
    show('Inicial'); render(); tick(5999);
    show('Último'); render();
    expiresIn(6000);
  });

  for (const renderDismiss of [false, true]) {
    it(`dismiss seguido de show, render intermediário=${renderDismiss}`, () => {
      show('Inicial'); render(); tick(2000);
      toast.dismiss();
      if (renderDismiss) { render(); expect(active.size).toBe(0); }
      show('Último'); render();
      expiresIn(6000);
    });
  }

  it('dismiss e destruição limpam os timers ativos', () => {
    show('Inicial'); render();
    toast.dismiss(); render(); expect(active.size).toBe(0);
    show('Último'); render(); expect(active.size).toBe(1);
    fixture.destroy(); expect(active.size).toBe(0);
    jasmine.clock().tick(10000);
    expect(toast.current()?.message).toBe('Último');
  });

  it('callback antigo e eventos repetidos não cancelam nem duplicam o novo timer', () => {
    const old = show('Inicial'); render();
    const callback = schedule.calls.all().find((call) => call.args[1] === 6000)!.args[0] as () => void;
    show('Último'); render();
    old.dismiss(); callback(); render();
    box()!.dispatchEvent(new MouseEvent('mouseleave'));
    box()!.dispatchEvent(new MouseEvent('mouseleave'));
    expect(box()?.textContent).toContain('Último');
    expiresIn(6000);
  });
});
