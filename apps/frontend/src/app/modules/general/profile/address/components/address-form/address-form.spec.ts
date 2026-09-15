import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Subject } from 'rxjs';
import { Geolocalization } from '@shared/service/geolocalization/geolocalization';
import { AddressForm } from './address-form';

describe('AddressForm', () => {
  let component: AddressForm;
  let fixture: ComponentFixture<AddressForm>;

  let lookup: jasmine.Spy;
  let response: Subject<any>;

  beforeEach(async () => {
    response = new Subject();
    lookup = jasmine.createSpy().and.returnValue(response);
    await TestBed.configureTestingModule({
      imports: [AddressForm],
      providers: [{ provide: Geolocalization, useValue: { getAddressByCep: lookup } }],
    }).compileComponents();

    fixture = TestBed.createComponent(AddressForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('only queries a complete CEP and preserves number and complement', () => {
    component.payload.number = '123';
    component.payload.complement = 'Apto 4';
    component.onCepChange('01001');
    expect(lookup).not.toHaveBeenCalled();
    component.onCepChange('01001-000');
    expect(lookup).toHaveBeenCalledOnceWith('01001000');
    response.next({ street: 'Praça da Sé', neighborhood: 'Sé', city: 'São Paulo', state: 'SP' });
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
    response.next({ street: 'Old street' });
    expect(component.payload.street).toBe('');
    expect(component.lookingUpCep()).toBeFalse();
  });

  it('allows manual entry after a failed lookup', () => {
    component.onCepChange('01001000');
    response.error({ status: 404 });
    expect(component.cepError()).toContain('CEP não encontrado');
    expect(component.lookingUpCep()).toBeFalse();
    const submit = spyOn(component.addressSubmit, 'emit');
    component.createAddress();
    expect(submit).toHaveBeenCalled();
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
      ...component.payload, cep: '01001000', street: 'Rua editada', lat: -23, lng: -46,
    });
    await editFixture.whenStable();
    expect(lookup).not.toHaveBeenCalled();
    expect(editFixture.componentInstance.payload.street).toBe('Rua editada');
    editFixture.destroy();
  });

  it('preserves fields edited while the lookup is pending', () => {
    component.onCepChange('01001000');
    component.payload.street = 'Rua digitada';
    response.next({ street: 'Praça da Sé', city: 'São Paulo', state: 'SP' });
    expect(component.payload.street).toBe('Rua digitada');
    expect(component.payload.city).toBe('São Paulo');
  });

  it('should create' , () => {
    expect(component).toBeTruthy();
  });
});
