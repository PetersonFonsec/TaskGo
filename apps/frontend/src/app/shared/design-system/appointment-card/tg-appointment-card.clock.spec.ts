import { Component, PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TgClock } from '../tg-clock';
import { TgAppointmentCardComponent, type TgAppointmentData } from './tg-appointment-card.component';

// Relógio controlado (jasmine.clock): nada depende da data real da execução.

@Component({
  imports: [TgAppointmentCardComponent],
  template: `
    @for (o of orders(); track o.id) {
      <tg-appointment-card [order]="o" perspective="customer" />
    }
  `,
})
class Host {
  readonly orders = signal<TgAppointmentData[]>([]);
}

const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

describe('TgAppointmentCardComponent com o TgClock', () => {
  let fake = false;
  const useFakeClock = () => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date(2026, 10, 15, 23, 59, 0));
    fake = true;
  };
  // Para contar os timers: espiona o setTimeout real (sem o relógio falso) e não agenda nada.
  const spyTimers = () => spyOn(window, 'setTimeout').and.returnValue(0 as never);
  const clockTimers = (spy: jasmine.Spy) => spy.calls.allArgs().filter(([, delay]) => Number(delay) >= 1000).length;

  beforeEach(() => (fake = false));

  afterEach(() => {
    TestBed.resetTestingModule();
    if (fake) jasmine.clock().uninstall();
  });

  const create = () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.orders.set([
      { id: '1', status: 'AGENDADO', service: 'Instalação de chuveiro', scheduledFor: new Date(2026, 10, 16, 9, 0) },
      { id: '2', status: 'AGENDADO', service: 'Limpeza', scheduledFor: new Date(2026, 10, 15, 14, 0) },
      { id: '3', status: 'AGENDADO', service: 'Pintura', scheduledFor: null },
    ]);
    fixture.detectChanges();
    return fixture;
  };
  const labels = (el: HTMLElement) => [...el.querySelectorAll('.tg-appointment-card__when')].map(text);

  it('vira o dia: "Amanhã" passa a "Hoje" e "Hoje" a "Ontem", nos mesmos cards', () => {
    useFakeClock();
    const fixture = create();
    const el: HTMLElement = fixture.nativeElement;
    const nodes = [...el.querySelectorAll('tg-appointment-card')];
    expect(labels(el)).toEqual(['Amanhã 09:00', 'Hoje 14:00', 'Data a combinar']);

    jasmine.clock().tick(61_000 + 1000);
    fixture.detectChanges();
    expect(labels(el)).toEqual(['Hoje 09:00', 'Ontem 14:00', 'Data a combinar']);
    expect([...el.querySelectorAll('tg-appointment-card')]).toEqual(nodes);
  });

  it('a hora não muda de formato na virada', () => {
    useFakeClock();
    const fixture = create();
    jasmine.clock().tick(62_000);
    fixture.detectChanges();
    expect(text(fixture.nativeElement.querySelector('.tg-appointment-card__time'))).toBe('09:00');
  });

  it('um único timer para a aplicação, não um por card', () => {
    const spy = spyTimers();
    const fixture = create();
    expect(fixture.nativeElement.querySelectorAll('tg-appointment-card').length).toBe(3);
    expect(clockTimers(spy)).toBe(1);
  });

  it('continua virando nos dias seguintes', () => {
    useFakeClock();
    const fixture = create();
    jasmine.clock().tick(62_000);
    jasmine.clock().tick(24 * 60 * 60 * 1000);
    fixture.detectChanges();
    expect(labels(fixture.nativeElement)[0]).toBe('Ontem 09:00');
  });

  it('no servidor não agenda nada', () => {
    const spy = spyTimers();
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
    const clock = TestBed.inject(TgClock);
    expect(clockTimers(spy)).toBe(0);
    expect(clock.now()).toEqual(jasmine.any(Date));
  });
});
