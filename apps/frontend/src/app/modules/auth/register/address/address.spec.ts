import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Observable, of, Subject, throwError } from 'rxjs';
import { RegisterUser } from '@modules/auth/services/register-user/register-user';
import { Geolocalization } from '@shared/service/geolocalization/geolocalization';
import { Address } from './address';

type CepResult = ReturnType<Geolocalization['getLatLngByCep']> extends Observable<infer T> ? T : never;

const FOUND: CepResult = {
  latitude: -23.56,
  longitude: -46.65,
  street: 'Avenida Paulista',
  neighborhood: 'Bela Vista',
  city: 'São Paulo',
  state: 'SP',
};

describe('Address (register step 3)', () => {
  let fixture: ComponentFixture<Address>;
  let element: HTMLElement;
  let navigate: jasmine.Spy;
  let getLatLngByCep: jasmine.Spy<(cep: string) => Observable<CepResult>>;
  let getCurrentPosition: jasmine.Spy<() => Observable<{ latitude: number; longitude: number }>>;

  async function setup(lookup: () => Observable<CepResult> = () => of(FOUND)) {
    getLatLngByCep = jasmine.createSpy('getLatLngByCep').and.callFake(lookup);
    getCurrentPosition = jasmine.createSpy('getCurrentPosition').and.returnValue(of({ latitude: -22.9, longitude: -43.2 }));
    TestBed.configureTestingModule({
      imports: [Address],
      providers: [provideRouter([]), { provide: Geolocalization, useValue: { getLatLngByCep, getCurrentPosition } }],
    });
    navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
    fixture = TestBed.createComponent(Address);
    element = fixture.nativeElement;
    document.body.appendChild(element);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  afterEach(() => element.remove());

  const input = (id: string) => element.querySelector<HTMLInputElement>(`#${id}`);
  const errors = () => Array.from(element.querySelectorAll('.tg-field__error')).map((e) => e.textContent?.trim());
  const alert = () => element.querySelector('tg-alert');
  async function type(id: string, value: string) {
    input(id)!.value = value;
    input(id)!.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }
  function submit() {
    element.querySelector<HTMLButtonElement>('#address-submit')!.click();
    fixture.detectChanges();
  }

  it('has the step heading and a way back to Criar conta', async () => {
    await setup();
    expect(element.querySelector('h1')?.textContent?.trim()).toBe('Onde você está');
    expect(element.querySelector('.auth__back')?.getAttribute('href')).toBe('/authenticate/register');
    expect(input('city-input')).toBeNull();
  });

  it('fills the address and the coordinates from the CEP', async () => {
    await setup();
    await type('zipcode-input', '01310100');
    expect(getLatLngByCep).toHaveBeenCalledOnceWith('01310100');
    expect(input('street-input')!.value).toBe('Avenida Paulista');
    expect(input('neighborhood-input')!.value).toBe('Bela Vista');
    expect(element.querySelector('.address__place')?.textContent).toContain('São Paulo · SP');
    expect(alert()).toBeNull();

    await type('number-input', '1000');
    submit();
    const address = TestBed.inject(RegisterUser).user().address;
    expect(address).toEqual(
      jasmine.objectContaining({ cep: '01310100', street: 'Avenida Paulista', number: '1000', city: 'São Paulo', state: 'SP', lat: -23.56, lng: -46.65 }),
    );
    expect(TestBed.inject(RegisterUser).completeSteps().address).toBeTrue();
    expect(navigate).toHaveBeenCalledWith('/authenticate/register');
  });

  it('warns when the CEP is not found and asks for the city, the UF and the location', async () => {
    await setup(() => throwError(() => ({ status: 404 })));
    await type('zipcode-input', '99999999');
    expect(alert()?.classList).toContain('tg-alert--warning');
    expect(alert()?.textContent).toContain('Não achamos esse CEP');
    expect(input('city-input')).not.toBeNull();
    expect(input('state-input')).not.toBeNull();
    expect(input('location-button')).not.toBeNull();
  });

  it('says the lookup failed when the CEP service errors', async () => {
    await setup(() => throwError(() => ({ status: 500 })));
    await type('zipcode-input', '01310100');
    expect(alert()?.textContent).toContain('Não foi possível buscar o CEP');
  });

  it('asks for the location when the CEP has no coordinates, and requires it on save', async () => {
    await setup(() => of({ ...FOUND, latitude: undefined, longitude: undefined }));
    await type('zipcode-input', '01310100');
    expect(alert()?.textContent).toContain('Precisamos da sua localização');
    await type('number-input', '1000');
    submit();
    expect(alert()?.classList).toContain('tg-alert--danger');
    expect(document.activeElement).toBe(input('location-button'));
    expect(navigate).not.toHaveBeenCalled();
  });

  it('stores the device location from "Usar minha localização"', async () => {
    await setup(() => throwError(() => ({ status: 404 })));
    await type('zipcode-input', '99999999');
    input('location-button')!.click();
    fixture.detectChanges();
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(alert()).toBeNull();
    expect(element.querySelector('p[role="status"].auth__muted:not(.address__place)')?.textContent?.trim()).toBe('Localização registrada.');
    expect(input('location-button')).toBeNull();

    await type('street-input', 'Rua Nova');
    await type('number-input', '12');
    await type('neighborhood-input', 'Centro');
    await type('city-input', 'Niterói');
    await type('state-input', 'rj');
    submit();
    expect(TestBed.inject(RegisterUser).user().address).toEqual(
      jasmine.objectContaining({ cep: '99999999', city: 'Niterói', state: 'RJ', lat: -22.9, lng: -43.2 }),
    );
    expect(navigate).toHaveBeenCalledWith('/authenticate/register');
  });

  it('explains when the device location is denied', async () => {
    await setup(() => throwError(() => ({ status: 404 })));
    getCurrentPosition.and.returnValue(throwError(() => ({ status: 403 })));
    await type('zipcode-input', '99999999');
    input('location-button')!.click();
    fixture.detectChanges();
    expect(alert()?.textContent).toContain('Permita o acesso no navegador');
    expect(input('location-button')).not.toBeNull();
  });

  it('shows the field errors on submit and focuses the CEP', async () => {
    await setup();
    submit();
    expect(errors()).toEqual(['Informe o CEP.', 'Informe a rua.', 'Informe o número.', 'Informe o bairro.']);
    expect(document.activeElement).toBe(input('zipcode-input'));
    expect(navigate).not.toHaveBeenCalled();
  });

  it('does not save while the CEP lookup runs', async () => {
    const pending = new Subject<CepResult>();
    await setup(() => pending);
    await type('zipcode-input', '01310100');
    expect(element.querySelector('#address-submit')?.getAttribute('aria-busy')).toBe('true');
    pending.next(FOUND);
    pending.complete();
    fixture.detectChanges();
    expect(element.querySelector('#address-submit')?.getAttribute('aria-busy')).not.toBe('true');
  });
});
