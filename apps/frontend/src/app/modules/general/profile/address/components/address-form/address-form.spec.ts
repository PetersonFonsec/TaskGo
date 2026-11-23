import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Subject } from 'rxjs';
import { Geolocalization } from '@shared/service/geolocalization/geolocalization';
import { AddressForm, addressErrors } from './address-form';

describe('AddressForm', () => {
  let component: AddressForm;
  let fixture: ComponentFixture<AddressForm>;

  let lookup: jasmine.Spy;
  let response: Subject<{
    street?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    latitude?: number;
    longitude?: number;
  }>;

  beforeEach(async () => {
    response = new Subject();
    lookup = jasmine.createSpy().and.returnValue(response);
    await TestBed.configureTestingModule({
      imports: [AddressForm],
      providers: [{ provide: Geolocalization, useValue: { getLatLngByCep: lookup } }],
    }).compileComponents();

    fixture = TestBed.createComponent(AddressForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('submits the default address choice when checked and unchecked', async () => {
    const checkbox: HTMLInputElement = fixture.nativeElement.querySelector('[name="isDefault"]');
    const submit = spyOn(component.addressSubmit, 'emit');
    component.payload.cep = '01001000';
    component.payload.lat = -23.55;
    component.payload.lng = -46.63;
    expect(checkbox.checked).toBeFalse();

    checkbox.click();
    await fixture.whenStable();
    response.next({
      street: 'Praça da Sé',
      city: 'São Paulo',
      state: 'SP',
      latitude: -23.55,
      longitude: -46.63,
    });
    component.createAddress();
    expect(submit).toHaveBeenCalledWith(jasmine.objectContaining({ isDefault: true }));

    checkbox.click();
    await fixture.whenStable();
    component.createAddress();
    expect(submit.calls.mostRecent().args[0].isDefault).toBeFalse();
  });

  it('only queries a complete CEP and preserves number and complement', () => {
    component.payload.number = '123';
    component.payload.complement = 'Apto 4';
    component.onCepChange('01001');
    expect(lookup).not.toHaveBeenCalled();
    component.onCepChange('01001-000');
    expect(lookup).toHaveBeenCalledOnceWith('01001000');
    response.next({
      street: 'Praça da Sé',
      neighborhood: 'Sé',
      city: 'São Paulo',
      state: 'SP',
      latitude: -23.55,
      longitude: -46.63,
    });
    expect(component.payload).toEqual(
      jasmine.objectContaining({
        street: 'Praça da Sé',
        neighborhood: 'Sé',
        city: 'São Paulo',
        state: 'SP',
        country: 'Brasil',
        number: '123',
        complement: 'Apto 4',
      }),
    );
    expect(component.lookingUpCep()).toBeFalse();
  });

  it('ignores an outdated lookup when the CEP changes', () => {
    component.onCepChange('01001000');
    component.onCepChange('01001');
    response.next({ street: 'Old street', latitude: -23.55, longitude: -46.63 });
    expect(component.payload.street).toBe('');
    expect(component.lookingUpCep()).toBeFalse();
  });

  it('blocks saving when a failed lookup leaves the address without coordinates', () => {
    component.onCepChange('01001000');
    response.error({ status: 404 });
    expect(component.cepError()).toContain('CEP não encontrado');
    expect(component.lookingUpCep()).toBeFalse();
    const submit = spyOn(component.addressSubmit, 'emit');
    component.createAddress();
    expect(submit).not.toHaveBeenCalled();
    expect(component.cepError()).toContain('Localize o endereço');
  });

  it('submits the coordinates returned by geocoding a changed CEP', () => {
    Object.assign(component.payload, {
      label: 'Casa',
      street: 'Rua A',
      number: '10',
      city: 'São Paulo',
      state: 'SP',
    });
    const submit = spyOn(component.addressSubmit, 'emit');
    component.onCepChange('01001000');
    response.next({
      street: 'Praça da Sé',
      city: 'São Paulo',
      state: 'SP',
      latitude: -23.55,
      longitude: -46.63,
    });

    component.createAddress();

    expect(submit).toHaveBeenCalledWith(jasmine.objectContaining({ lat: -23.55, lng: -46.63 }));
  });

  it('blocks saving an incomplete CEP or a pending lookup', () => {
    const submit = spyOn(component.addressSubmit, 'emit');
    component.onCepChange('01001');
    component.createAddress();
    component.onCepChange('01001000');
    component.createAddress();
    expect(submit).not.toHaveBeenCalled();
  });

  it('displays the CEP mask and starts the lookup through the input', async () => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('#address-cep-input');
    input.value = '01001000';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
    expect(input.value).toBe('01001-000');
    expect(lookup).toHaveBeenCalledOnceWith('01001000');
  });

  it('preserves the existing address when opening the edit form', async () => {
    const editFixture = TestBed.createComponent(AddressForm);
    editFixture.componentRef.setInput('initialAddress', {
      ...component.payload,
      cep: '01001000',
      street: 'Rua editada',
      lat: -23,
      lng: -46,
      isDefault: true,
    });
    await editFixture.whenStable();
    expect(lookup).not.toHaveBeenCalled();
    expect(editFixture.componentInstance.payload.street).toBe('Rua editada');
    expect(editFixture.nativeElement.querySelector('[name="isDefault"]').checked).toBeTrue();
    editFixture.destroy();
  });

  it('preserves fields edited while the lookup is pending', () => {
    component.onCepChange('01001000');
    component.payload.street = 'Rua digitada';
    response.next({
      street: 'Praça da Sé',
      city: 'São Paulo',
      state: 'SP',
      latitude: -23.55,
      longitude: -46.63,
    });
    expect(component.payload.street).toBe('Rua digitada');
    expect(component.payload.city).toBe('São Paulo');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('não envia com campos obrigatórios vazios e envia o texto sem espaços nas pontas', async () => {
    const submit = spyOn(component.addressSubmit, 'emit');
    component.submit();
    expect(submit).not.toHaveBeenCalled();
    expect(component.errors().street).toBe('Informe a rua.');

    Object.assign(component.payload, {
      label: ' Casa ',
      cep: '01001000',
      street: ' Rua A ',
      number: ' 12 ',
      city: 'São Paulo',
      state: 'SP',
      lat: -23.55,
      lng: -46.63,
    });
    component.submit();
    expect(submit).toHaveBeenCalledWith(
      jasmine.objectContaining({
        label: 'Casa',
        street: 'Rua A',
        number: '12',
        complement: '',
        isDefault: false,
      }),
    );
  });
});

describe('addressErrors', () => {
  const valid = {
    label: 'Casa',
    street: 'Rua A',
    number: '12',
    complement: '',
    neighborhood: '',
    city: 'São Paulo',
    state: 'SP',
    country: 'Brasil',
    cep: '01001-000',
    lat: 0,
    lng: 0,
  };

  it('aceita o endereço com os campos do DTO, sem complemento nem bairro', () => {
    expect(Object.values(addressErrors(valid)).every((error) => error === '')).toBeTrue();
  });

  it('recusa campos vazios ou só com espaços e CEP sem 8 dígitos', () => {
    const errors = addressErrors({ ...valid, label: '  ', number: '', cep: '0100' });
    expect(errors.label).not.toBe('');
    expect(errors.number).toBe('Informe o número.');
    expect(errors.cep).toBe('Informe os 8 dígitos do CEP.');
    expect(addressErrors({ ...valid, cep: '' }).cep).toBe('Informe o CEP.');
  });
});
