import { TestBed } from '@angular/core/testing';

import { Theme } from './theme';
import { RolesBack } from '@shared/enums/roles.enum';

describe('Theme', () => {
  let service: Theme;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Theme);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should normalize the backend provider role', () => {
    service.setTheme(RolesBack.PROVIDER);

    expect(document.documentElement.dataset['theme']).toBe('PROVIDER');
    expect(service.change.value).toBe('PROVIDER');
  });

  it('should use the customer theme for the backend customer role', () => {
    service.setTheme(RolesBack.CUSTOMER);

    expect(document.documentElement.dataset['theme']).toBe('CUSTOMER');
    expect(service.change.value).toBe('CUSTOMER');
  });
});
