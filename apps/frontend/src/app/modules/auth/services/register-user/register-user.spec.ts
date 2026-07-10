import { TestBed } from '@angular/core/testing';

import { RegisterUser } from './register-user';
import { UserRegister as UserRegisterHttp } from '@shared/service/users/user-register';
import { UserStorage } from '@shared/service/users/user-storage';
import { Roles } from '@shared/enums/roles.enum';

describe('RegisterUser', () => {
  let service: RegisterUser;
  let registerHttp: jasmine.SpyObj<UserRegisterHttp>;
  let userStorage: { type: jasmine.Spy };

  beforeEach(() => {
    registerHttp = jasmine.createSpyObj<UserRegisterHttp>('UserRegisterHttp', [
      'registerUser',
    ]);
    registerHttp.registerUser.and.returnValue({ subscribe: () => undefined } as any);
    userStorage = {
      type: jasmine.createSpy('type').and.returnValue(Roles.PROVIDER),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: UserRegisterHttp, useValue: registerHttp },
        { provide: UserStorage, useValue: userStorage },
      ],
    });
    service = TestBed.inject(RegisterUser);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('builds a shared registration payload with the selected provider role', () => {
    service.addPersonalInfo({
      name: 'Provider User',
      email: 'provider@example.com',
      password: 'secret',
      confirmPassword: 'secret',
      phone: '11999999999',
      cpf: '12345678900',
    });
    service.addAddress({
      label: 'Principal',
      street: 'Rua A',
      number: '10',
      city: 'Sao Paulo',
      state: 'SP',
      cep: '01001000',
      lat: -23.55,
      lng: -46.63,
      neighborhood: 'Centro',
      complement: '',
    });
    service.addSocial({ whatsapp: '11999999999', instagram: 'taskgo' });
    service.addService([{ id: 'service-1' }, { id: 2 }]);

    service.register();

    expect(registerHttp.registerUser).toHaveBeenCalledWith(
      jasmine.objectContaining({
        name: 'Provider User',
        email: 'provider@example.com',
        password: 'secret',
        phone: '11999999999',
        cpf: '12345678900',
        type: 'PRESTADOR',
        services: ['service-1', '2'],
      }),
    );
    expect(registerHttp.registerUser.calls.mostRecent().args[0] as any)
      .not.toEqual(jasmine.objectContaining({
        confirmPassword: jasmine.anything(),
      }));
  });

  it('keeps registration step completion state local', () => {
    expect(service.completeSteps()).toEqual({
      profile: false,
      contact: false,
      address: false,
      category: false,
      service: false,
    });

    service.addPersonalInfo({ name: 'Customer' });
    service.addAddress({ street: 'Rua A' });

    expect(service.completeSteps().profile).toBeTrue();
    expect(service.completeSteps().address).toBeTrue();
    expect(service.user()).not.toEqual(jasmine.objectContaining({
      completeSteps: jasmine.anything(),
    }));
  });
});
