import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, ParamMap, provideRouter, Router } from '@angular/router';
import { BehaviorSubject, Observable, of, Subject, throwError } from 'rxjs';
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
  let params: BehaviorSubject<ParamMap>;

  function setup(response: (id: string) => Observable<ICategoryWithSubCategories> = () => of(CLEANING)) {
    params = new BehaviorSubject(convertToParamMap({ categoryId: '1' }));
    getCategoryById = jasmine.createSpy('getCategoryById').and.callFake(response);
    TestBed.configureTestingModule({
      imports: [Services],
      providers: [
        provideRouter([]),
        { provide: CategoryService, useValue: { getCategoryById } },
        { provide: ActivatedRoute, useValue: { paramMap: params } },
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

  describe('only the active request drives loading (regressão PR #38)', () => {
    const REPAIRS: ICategoryWithSubCategories = {
      ...CLEANING,
      id: 2,
      name: 'Reparos',
      subcategories: [service(21, 'Elétrica', 2), service(22, 'Encanamento', 2)],
    };
    let requests: Record<string, Subject<ICategoryWithSubCategories>[]>;
    const names = () => fixture.componentInstance.services().map((s) => s.name);
    function answer(id: string, category: ICategoryWithSubCategories, index = 0) {
      requests[id][index].next(category);
      requests[id][index].complete();
      fixture.detectChanges();
    }

    beforeEach(() => {
      requests = {};
      setup((id) => {
        const request = new Subject<ICategoryWithSubCategories>();
        (requests[id] ??= []).push(request);
        return request;
      });
      create();
    });

    it('I: a category change ignores the old answer and stays loading', () => {
      params.next(convertToParamMap({ categoryId: '2' }));
      fixture.detectChanges();
      expect(fixture.componentInstance.loading()).toBeTrue();

      answer('1', CLEANING);
      expect(fixture.componentInstance.loading()).toBeTrue();
      expect(names()).toEqual([]);

      answer('2', REPAIRS);
      expect(fixture.componentInstance.loading()).toBeFalse();
      expect(names()).toEqual(['Elétrica', 'Encanamento']);
      expect(element.querySelector('h1')?.textContent?.trim()).toBe('Reparos: o que você faz?');
    });

    it('I: does not show the previous category while the next one loads', () => {
      answer('1', CLEANING);
      expect(names().length).toBe(3);
      params.next(convertToParamMap({ categoryId: '2' }));
      fixture.detectChanges();
      expect(fixture.componentInstance.loading()).toBeTrue();
      expect(names()).toEqual([]);
      expect(element.querySelector('h1')?.textContent?.trim()).toBe('O que você faz?');
    });

    it('G: stays loading while a retry replaces the request', () => {
      fixture.componentInstance.retry.next();
      fixture.detectChanges();
      expect(requests['1'].length).toBe(2);
      expect(fixture.componentInstance.loading()).toBeTrue();
      answer('1', CLEANING, 1);
      expect(fixture.componentInstance.loading()).toBeFalse();
    });

    it('H: an old failure does not replace a newer answer', () => {
      fixture.componentInstance.retry.next();
      fixture.detectChanges();
      requests['1'][0].error(new Error('offline'));
      fixture.detectChanges();
      expect(element.querySelector('tg-alert')).toBeNull();
      answer('1', CLEANING, 1);
      expect(element.querySelector('tg-alert')).toBeNull();
      expect(names().length).toBe(3);
    });
  });
});
