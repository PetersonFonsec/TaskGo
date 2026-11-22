import { provideZonelessChangeDetection, signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { Theme } from '@shared/service/theme/theme';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';

describe('App', () => {
  let session: ReturnType<typeof signal<any>>;
  let setTheme: jasmine.Spy;

  beforeEach(async () => {
    session = signal({ user: { type: 'CLIENTE' } });
    setTheme = jasmine.createSpy('setTheme');
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: Theme, useValue: { setTheme } },
        { provide: UserLoggedService, useValue: { user: session } },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
    fixture.detectChanges();
  });

  it('should render the route outlet', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).not.toBeNull();
    expect(compiled.querySelector('tg-toast-region')).not.toBeNull();
    expect(setTheme).toHaveBeenCalledWith('CLIENTE');
  });

  it('applies the visitor theme in the app root', () => {
    session.set({ user: null });
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    expect(setTheme).toHaveBeenCalledWith('CUSTOMER');
  });

  it('applies the provider theme in the app root', () => {
    session.set({ user: { type: 'PRESTADOR' } });
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    expect(setTheme).toHaveBeenCalledWith('PRESTADOR');
  });
});
