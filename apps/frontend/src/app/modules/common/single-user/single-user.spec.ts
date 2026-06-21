import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { HttpErrorResponse } from '@angular/common/http';

import { SingleUser } from './single-user';
import { Provider } from '@shared/service/provider/provider';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { User } from '@shared/service/users/user';
import { ProviderAvailabilityResponse } from '@shared/service/provider/provider.model';

describe('SingleUser', () => {
  let component: SingleUser;
  let fixture: ComponentFixture<SingleUser>;
  let providerMock: any;
  let userLoggedMock: any;
  let liveAnnouncerMock: any;
  let availabilityResponse: ProviderAvailabilityResponse;
  const providerResponse = {
    id: '1',
    user: { name: 'Test Provider', photoUrl: '' },
    bio: 'Atendimento residencial com profissionais avaliados.',
    reviews: [{ rating: 5, comment: 'Excelente atendimento.' }],
    services: [{ id: 's1', title: 'Service 1', basePrice: 120 }],
  };

  beforeEach(async () => {
    availabilityResponse = {
      providerId: '1',
      timezone: 'America/Sao_Paulo',
      days: [
        {
          date: '2026-06-22',
          available: false,
          slots: [
            {
              startsAt: '2026-06-22T12:00:00.000Z',
              endsAt: '2026-06-22T13:00:00.000Z',
              serviceId: 's1',
              label: '09:00',
              available: false,
            },
          ],
        },
        {
          date: '2026-06-23',
          available: true,
          slots: [
            {
              startsAt: '2026-06-23T12:00:00.000Z',
              endsAt: '2026-06-23T13:00:00.000Z',
              serviceId: 's1',
              label: '09:00',
              available: true,
            },
          ],
        },
        {
          date: '2026-06-24',
          available: true,
          slots: [
            {
              startsAt: '2026-06-24T14:00:00.000Z',
              endsAt: '2026-06-24T15:00:00.000Z',
              serviceId: 's1',
              label: '11:00',
              available: true,
            },
          ],
        },
      ],
    };

    providerMock = {
      getProvider: jasmine.createSpy('getProvider').and.returnValue(of(providerResponse)),
      getAvailability: jasmine
        .createSpy('getAvailability')
        .and.returnValue(of(availabilityResponse)),
      hireProvider: jasmine.createSpy('hireProvider').and.returnValue(of({ id: 'order-1' })),
      addFavorite: jasmine.createSpy('addFavorite').and.returnValue(of(null)),
      removeFavorite: jasmine.createSpy('removeFavorite').and.returnValue(of(null)),
      listFavorites: jasmine.createSpy('listFavorites').and.returnValue(of({ items: [] })),
    };

    userLoggedMock = {
      user: jasmine.createSpy('user').and.returnValue({
        user: {
          id: 'client-1',
          type: 'CUSTOMER',
          addresses: [
            {
              street: 'Rua A',
              number: '100',
              complement: '',
              neighborhood: 'Centro',
              city: 'Sao Paulo',
              state: 'SP',
              cep: '01000-000',
              lat: -23.5,
              lng: -46.6,
            },
          ],
        },
      }),
    };

    liveAnnouncerMock = {
      announce: jasmine.createSpy('announce'),
    };

    await TestBed.configureTestingModule({
      imports: [SingleUser],
      providers: [
        { provide: ActivatedRoute, useValue: { params: of({ userId: '1' }) } },
        { provide: Router, useValue: {} },
        { provide: Provider, useValue: providerMock },
        { provide: UserLoggedService, useValue: userLoggedMock },
        { provide: User, useValue: { getProvider: providerMock.getProvider } },
        { provide: LiveAnnouncer, useValue: liveAnnouncerMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SingleUser);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load availability for the default booking range after provider load', () => {
    expect(providerMock.getProvider).toHaveBeenCalledWith('1');
    expect(providerMock.getAvailability).toHaveBeenCalledWith(
      '1',
      jasmine.objectContaining({
        serviceId: 's1',
      }),
    );
    const query = providerMock.getAvailability.calls.mostRecent().args[1];
    expect(query.from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(query.to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(component.availabilityDays()).toEqual(availabilityResponse.days);
    expect(component.selectedDate()).toBe('2026-06-23');
    expect(component.selectedSlot()).toBeNull();
  });

  it('should update appointment summary when selecting a slot', () => {
    const slot = availabilityResponse.days[1].slots[0];

    component.selectSlot(slot);

    expect(component.selectedSlot()).toBe(slot);
    expect(component.appointmentSummary()).toEqual({
      date: '2026-06-23',
      startsAt: '2026-06-23T12:00:00.000Z',
      endsAt: '2026-06-23T13:00:00.000Z',
      label: '09:00',
      timezone: 'America/Sao_Paulo',
      serviceTitle: 'Service 1',
      price: 120,
    });
  });

  it('should clear the selected slot when selecting a different available date', () => {
    component.selectSlot(availabilityResponse.days[1].slots[0]);

    component.selectDate('2026-06-24');

    expect(component.selectedDate()).toBe('2026-06-24');
    expect(component.selectedSlot()).toBeNull();
    expect(component.appointmentSummary()).toBeNull();
  });

  it('should ignore unavailable date selection attempts', () => {
    component.selectSlot(availabilityResponse.days[1].slots[0]);

    component.selectDate('2026-06-22');

    expect(component.selectedDate()).toBe('2026-06-23');
    expect(component.selectedSlot()).toBe(availabilityResponse.days[1].slots[0]);
  });

  it('should render available dates as selectable controls', () => {
    const dateButtons = fixture.nativeElement.querySelectorAll('.booking-dates button');
    const availableDateButton = Array.from(dateButtons).find((button: any) =>
      button.getAttribute('aria-label')?.includes('Selecionar'),
    ) as HTMLButtonElement;

    expect(availableDateButton).toBeTruthy();
    expect(availableDateButton.disabled).toBeFalse();
    expect(availableDateButton.getAttribute('aria-pressed')).toBe('true');
    expect(availableDateButton.textContent).toContain('Disponível');
  });

  it('should render unavailable dates as disabled controls', () => {
    const dateButtons = fixture.nativeElement.querySelectorAll('.booking-dates button');
    const unavailableDateButton = Array.from(dateButtons).find((button: any) =>
      button.textContent?.includes('Indisponível'),
    ) as HTMLButtonElement;

    expect(unavailableDateButton).toBeTruthy();
    expect(unavailableDateButton.disabled).toBeTrue();
    expect(unavailableDateButton.getAttribute('aria-label')).toContain('indisponível');
  });

  it('should expose the selected slot through an accessible pressed state', () => {
    const slot = availabilityResponse.days[1].slots[0];

    component.selectSlot(slot);
    fixture.detectChanges();

    const selectedSlotButton = fixture.nativeElement.querySelector(
      '.booking-slots button.selected',
    );
    expect(selectedSlotButton).toBeTruthy();
    expect(selectedSlotButton.getAttribute('aria-pressed')).toBe('true');
    expect(selectedSlotButton.getAttribute('aria-label')).toBe('Selecionar horário 09:00');
  });

  it('should disable the submit button when no slot is selected', () => {
    component.selectedSlot.set(null);
    fixture.detectChanges();

    const submitButton = fixture.nativeElement.querySelector('#booking-request-button');
    expect(submitButton.disabled).toBeTrue();
  });

  it('should render the availability loading state', () => {
    component.availabilityLoading.set(true);
    fixture.detectChanges();

    const status = fixture.nativeElement.querySelector('[role="status"]');
    expect(status).toBeTruthy();
    expect(status.textContent).toContain('Carregando horários disponíveis');
  });

  it('should render an empty state when no available slots exist', () => {
    component.availabilityLoading.set(false);
    component.availabilityError.set('');
    component.availabilityDays.set([
      {
        date: '2026-06-25',
        available: false,
        slots: [],
      },
    ]);
    component.selectedDate.set(null);
    component.selectedSlot.set(null);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Nenhum horário disponível para os próximos dias.',
    );
    expect(component.hasAvailableSlots()).toBeFalse();
  });

  it('should render availability loading errors', () => {
    component.availabilityLoading.set(false);
    component.availabilityError.set('Não foi possível carregar os horários disponíveis.');
    fixture.detectChanges();

    const alert = fixture.nativeElement.querySelector('.booking-state [role="alert"]');
    expect(alert).toBeTruthy();
    expect(alert.textContent).toContain('Não foi possível carregar os horários disponíveis.');
  });

  it('should ignore unavailable slot selection attempts', () => {
    component.selectSlot(availabilityResponse.days[1].slots[0]);

    component.selectSlot(availabilityResponse.days[0].slots[0]);

    expect(component.selectedSlot()).toBe(availabilityResponse.days[1].slots[0]);
  });

  it('should update the rendered appointment summary when date and slot change', () => {
    component.selectDate('2026-06-23');
    component.selectSlot(availabilityResponse.days[1].slots[0]);
    fixture.detectChanges();

    const summary = fixture.nativeElement.querySelector('.appointment-summary');
    expect(summary.textContent).toContain('Service 1');
    expect(summary.textContent).toContain('23 de junho');
    expect(summary.textContent).toContain('09:00');
    expect(summary.textContent).toMatch(/R\$\s*120,00/);
    expect(summary.textContent).toContain('Pagamento via PIX');
  });

  it('should render provider details, slots, and summary together', () => {
    const pageText = fixture.nativeElement.textContent;

    expect(pageText).toContain('Test Provider');
    expect(pageText).toContain('Service 1');
    expect(pageText).toContain('1 avaliações');
    expect(pageText).toContain('09:00');
    expect(pageText).toContain('Solicitar agendamento');
    expect(fixture.nativeElement.querySelector('.appointment-summary')).toBeTruthy();
  });

  it('should not call hireProvider when registering without a selected slot', () => {
    component.selectedSlot.set(null);

    component.register();

    expect(providerMock.hireProvider).not.toHaveBeenCalled();
    expect(component.error()).toBe('Selecione um horário disponível antes de contratar.');
    expect(liveAnnouncerMock.announce).toHaveBeenCalledWith(
      'Selecione um horário disponível antes de contratar.',
    );
  });

  it('should send scheduledFor when registering with a selected slot', () => {
    component.selectSlot(availabilityResponse.days[1].slots[0]);

    component.register();

    expect(providerMock.hireProvider).toHaveBeenCalledWith(
      jasmine.objectContaining({
        serviceId: 's1',
        clientId: 'client-1',
        scheduledFor: '2026-06-23T12:00:00.000Z',
        paymentMethod: 'PIX',
      }),
    );
    expect(component.showModal()).toBeTrue();
  });

  it('should call addFavorite when the favorite toggle is activated', () => {
    component.favoriteState.set(false);
    component.toggleFavorite();

    expect(providerMock.addFavorite).toHaveBeenCalledWith('client-1', '1');
    expect(liveAnnouncerMock.announce).toHaveBeenCalledWith(
      'Profissional adicionado aos favoritos.',
    );
    expect(component.favoriteState()).toBeTrue();
  });

  it('should call removeFavorite when the favorite toggle is deactivated', () => {
    component.favoriteState.set(true);
    component.toggleFavorite();

    expect(providerMock.removeFavorite).toHaveBeenCalledWith('client-1', '1');
    expect(liveAnnouncerMock.announce).toHaveBeenCalledWith('Profissional removido dos favoritos.');
    expect(component.favoriteState()).toBeFalse();
  });

  it('should show unavailable-slot backend errors without losing provider context', () => {
    providerMock.hireProvider.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { message: ['Horário indisponível para agendamento.'] },
          }),
      ),
    );
    component.selectSlot(availabilityResponse.days[1].slots[0]);

    component.register();
    fixture.detectChanges();

    expect(component.provider().id).toBe('1');
    expect(component.selectedSlot()?.startsAt).toBe('2026-06-23T12:00:00.000Z');
    expect(component.error()).toBe('Horário indisponível para agendamento.');
    expect(fixture.nativeElement.textContent).toContain('Horário indisponível para agendamento.');
  });
});
