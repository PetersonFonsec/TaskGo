import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { RegisterUser } from '@modules/auth/services/register-user/register-user';
import { CategoryService } from '@shared/service/category/category';
import { ICategoryWithSubCategories, ISubCategory } from '@shared/service/category/category.model';
import { Services } from './services';

const service = (id: number, name: string, categoryId = 1): ISubCategory => ({
  id,
  categoryId,
  name,
  slug: name.toLowerCase(),
  description: '',
  icon: '',
  sortOrder: id,
  isActive: true,
  createdAt: {},
  updatedAt: {},
});
const CLEANING: ICategoryWithSubCategories = {
  id: 1,
  name: 'Limpeza',
  slug: 'limpeza',
  description: '',
  icon: '',
  sortOrder: 1,
  isActive: true,
  createdAt: {},
  updatedAt: {},
  platformFeePct: null,
  subcategories: [service(11, 'Diarista'), service(12, 'Passadeira'), service(13, 'Pós-obra')],
};

describe('Services (register step 4)', () => {
  let fixture: ComponentFixture<Services>;
  let element: HTMLElement;
  let navigate: jasmine.Spy;
  let getCategoryById: jasmine.Spy<(id: string) => Observable<ICategoryWithSubCategories>>;

  function setup(response: () => Observable<ICategoryWithSubCategories> = () => of(CLEANING)) {
    getCategoryById = jasmine.createSpy('getCategoryById').and.callFake(response);
    TestBed.configureTestingModule({
      imports: [Services],
      providers: [
        provideRouter([]),
        { provide: CategoryService, useValue: { getCategoryById } },
        { provide: ActivatedRoute, useValue: { paramMap: new BehaviorSubject(convertToParamMap({ categoryId: '1' })) } },
      ],
    });
    navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
  }
  function create() {
    fixture = TestBed.createComponent(Services);
    element = fixture.nativeElement;
    document.body.appendChild(element);
    fixture.detectChanges();
  }

  afterEach(() => element.remove());

  const checkbox = (id: number) => element.querySelector<HTMLInputElement>(`#service-${id} input[type="checkbox"]`)!;
  const count = () => element.querySelector('#service-list + .auth__muted')?.textContent?.trim();
  const submit = () => {
    element.querySelector<HTMLButtonElement>('#services-submit')!.click();
    fixture.detectChanges();
  };

  it('loads the services of the category in the route', () => {
    setup();
    create();
    expect(getCategoryById).toHaveBeenCalledOnceWith('1');
    expect(element.querySelector('h1')?.textContent?.trim()).toBe('Limpeza: o que você faz?');
    expect(element.querySelectorAll('#service-list label[tgCard]').length).toBe(3);
    expect(element.querySelector('.auth__back')?.getAttribute('href')).toBe('/authenticate/category');
    expect(count()).toBe('0 selecionados');
  });

  it('toggles services, counts them and saves the selection', () => {
    setup();
    create();
    checkbox(11).click();
    checkbox(13).click();
    checkbox(13).click();
    checkbox(12).click();
    fixture.detectChanges();
    expect(count()).toBe('2 selecionados');
    submit();
    const registerUser = TestBed.inject(RegisterUser);
    expect(registerUser.user().services.map((s) => (s as ISubCategory).id)).toEqual([11, 12]);
    expect(registerUser.completeSteps().service).toBeTrue();
    expect(navigate).toHaveBeenCalledWith('/authenticate/register');
  });

  it('asks for at least one service on submit and focuses the first option', () => {
    setup();
    create();
    submit();
    expect(element.querySelector('tg-alert')?.textContent).toContain('Escolha pelo menos um serviço');
    expect(document.activeElement).toBe(checkbox(11));
    expect(navigate).not.toHaveBeenCalled();
  });

  it('keeps the services already chosen in this category', () => {
    setup();
    TestBed.inject(RegisterUser).user.update((user) => ({ ...user, services: [service(12, 'Passadeira'), service(31, 'Elétrica', 3)] }));
    create();
    expect(checkbox(12).checked).toBeTrue();
    expect(checkbox(11).checked).toBeFalse();
    expect(count()).toBe('1 selecionado');
  });

  it('shows an error with "Tentar de novo" and retries', () => {
    let calls = 0;
    setup(() => (++calls === 1 ? throwError(() => new Error('offline')) : of(CLEANING)));
    create();
    expect(element.querySelector('tg-alert')?.textContent).toContain('Não foi possível carregar os serviços');
    element.querySelector<HTMLButtonElement>('tg-alert button')!.click();
    fixture.detectChanges();
    expect(getCategoryById).toHaveBeenCalledTimes(2);
    expect(element.querySelectorAll('#service-list label[tgCard]').length).toBe(3);
  });
});
