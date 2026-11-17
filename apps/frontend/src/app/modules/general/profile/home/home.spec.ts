import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';

import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { Home } from './home';

describe('Home (Conta)', () => {
  it('lista Dados pessoais e Endereços e "Sair da conta" encerra a sessão', async () => {
    const logout = jasmine.createSpy('logout');
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [provideRouter([]), { provide: UserLoggedService, useValue: { logout } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(Home);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const labels = Array.from(el.querySelectorAll('.account__label')).map((n) => n.textContent?.trim());
    expect(labels).toEqual(['Dados pessoais', 'Endereços']);
    const signOut = Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes('Sair da conta'));
    signOut!.click();
    expect(logout).toHaveBeenCalledTimes(1);
  });
});
