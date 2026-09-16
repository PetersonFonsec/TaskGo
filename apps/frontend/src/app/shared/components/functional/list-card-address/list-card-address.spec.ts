import { of, Subject, throwError } from 'rxjs';
import { By } from '@angular/platform-browser';
import { Address as AddressService } from '@shared/service/address/address';
import { IFullAddress } from '@shared/service/address/address.model';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AddressForm } from '../../../../modules/general/profile/address/components/address-form/address-form';
import { Geolocalization } from '@shared/service/geolocalization/geolocalization';
import { ListCardAddress } from './list-card-address';

describe('ListCardAddress actions', () => {
  let fixture: ComponentFixture<ListCardAddress>;
  let api: jasmine.SpyObj<AddressService>;
  const address = {
    id: '10',
    label: 'Casa',
    street: 'Rua A',
    number: '12',
    complement: '',
    city: 'São Paulo',
    state: 'SP',
    cep: '01001000',
    lat: 0,
    lng: 0,
    neighborhood: '',
    country: '',
    isDefault: true,
  } as IFullAddress;

  beforeEach(async () => {
    api = jasmine.createSpyObj('Address', [
      'getAddress',
      'createAddress',
      'updateAddress',
      'removeAddress',
    ]);
    api.getAddress.and.returnValue(of({ data: [address] } as any));
    api.createAddress.and.returnValue(of(address));
    api.updateAddress.and.returnValue(of(address));
    api.removeAddress.and.returnValue(of({}));
    await TestBed.configureTestingModule({
      imports: [ListCardAddress],
      providers: [
        { provide: AddressService, useValue: api },
        {
          provide: Geolocalization,
          useValue: { getAddressByCep: () => of({ city: 'São Paulo', state: 'SP' }) },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ListCardAddress);
    await fixture.whenStable();
  });

  async function click(selector: string) {
    fixture.nativeElement.querySelector(selector).click();
    await fixture.whenStable();
  }

  it('opens a blank form and creates an address using values entered in the fields', async () => {
    await click('.list-card-address_add');
    expect(fixture.nativeElement.querySelector('dialog').open).toBeTrue();
    expect(fixture.nativeElement.querySelector('dialog app-address-form')).not.toBeNull();
    const submit: HTMLButtonElement = fixture.nativeElement.querySelector(
      '.drawer-footer button[type="submit"]',
    );
    expect(submit.form).toBe(fixture.nativeElement.querySelector('app-address-form form'));
    expect(submit.disabled).toBeTrue();
    expect(fixture.nativeElement.querySelector('.drawer-content button[type="submit"]')).toBeNull();
    const values: Record<string, string> = {
      label: 'Trabalho',
      cep: '01001000',
      street: 'Rua B',
      number: '5',
      city: 'São Paulo',
      state: 'SP',
    };
    for (const [name, value] of Object.entries(values)) {
      const input = fixture.nativeElement.querySelector('#address-' + name + '-input');
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }
    await fixture.whenStable();
    await click('.drawer-footer button[type="submit"]');
    expect(api.createAddress).toHaveBeenCalledWith(jasmine.objectContaining(values));
    expect(api.getAddress).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.querySelector('app-address-form')).toBeNull();
    expect(fixture.nativeElement.querySelector('dialog').open).toBeFalse();
  });

  it('opens a populated form and updates the selected address', async () => {
    await click('.card-address_edit');
    const form = fixture.debugElement.query(By.directive(AddressForm))
      .componentInstance as AddressForm;
    expect(form.payload.label).toBe('Casa');
    form.payload.label = 'Casa nova';
    await click('.drawer-footer button[type="submit"]');
    expect(api.updateAddress).toHaveBeenCalledWith(
      '10',
      jasmine.objectContaining({ label: 'Casa nova' }),
    );
    expect(api.getAddress).toHaveBeenCalledTimes(2);
  });

  it('closes the drawer and resets the form when reopened', async () => {
    await click('.list-card-address_add');
    const form = fixture.debugElement.query(By.directive(AddressForm))
      .componentInstance as AddressForm;
    form.payload.label = 'Rascunho';
    await click('dialog header button');
    expect(fixture.componentInstance.formOpen()).toBeFalse();
    await click('.list-card-address_add');
    const reopened = fixture.debugElement.query(By.directive(AddressForm))
      .componentInstance as AddressForm;
    expect(reopened.payload.label).toBe('');
  });

  it('prevents dismissal while saving and closes on success', async () => {
    const pending = new Subject<any>();
    api.updateAddress.and.returnValue(pending);
    await click('.card-address_edit');
    await click('.drawer-footer button[type="submit"]');
    const dialog: HTMLDialogElement = fixture.nativeElement.querySelector('dialog');
    const cancel = new Event('cancel', { cancelable: true });
    dialog.dispatchEvent(cancel);
    expect(cancel.defaultPrevented).toBeTrue();
    expect(fixture.nativeElement.querySelector('dialog header button').disabled).toBeTrue();
    pending.next(address);
    await fixture.whenStable();
    expect(dialog.open).toBeFalse();
  });

  it('requires confirmation before deleting and reloads the list', async () => {
    await click('.card-address_remove');
    expect(api.removeAddress).not.toHaveBeenCalled();
    await click('[aria-label="Confirmar remoção"] button');
    expect(api.removeAddress).toHaveBeenCalledWith('10');
    expect(api.getAddress).toHaveBeenCalledTimes(2);
  });

  it('keeps the form and shows an error when saving fails', async () => {
    api.updateAddress.and.returnValue(throwError(() => new Error('offline')));
    await click('.card-address_edit');
    await click('.drawer-footer button[type="submit"]');
    expect(fixture.nativeElement.querySelector('app-address-form')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'Não foi possível salvar',
    );
    expect(fixture.componentInstance.saving()).toBeFalse();
  });
});
