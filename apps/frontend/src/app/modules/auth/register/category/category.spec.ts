import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Observable, of, Subject, throwError } from 'rxjs';
import { RegisterUser } from '@modules/auth/services/register-user/register-user';
import { CategoryService } from '@shared/service/category/category';
import { ICategory, ISubCategory } from '@shared/service/category/category.model';
import { Category } from './category';

type CategoriesResponse = ReturnType<CategoryService['getCategories']> extends Observable<infer T> ? T : never;

const category = (id: number, name: string): ICategory => ({
  id,
  name,
  slug: name.toLowerCase(),
  description: '',
  icon: '',
  sortOrder: id,
  isActive: true,
  createdAt: {},
  updatedAt: {},
  platformFeePct: null,
});
const page = (data: ICategory[]) => ({ data }) as unknown as CategoriesResponse;

describe('Category (register step 4)', () => {
  let fixture: ComponentFixture<Category>;
  let element: HTMLElement;
  let navigate: jasmine.Spy;
  let getCategories: jasmine.Spy<() => Observable<CategoriesResponse>>;

  function setup(response: () => Observable<CategoriesResponse> = () => of(page([category(1, 'Limpeza'), category(2, 'Reparos')]))) {
    getCategories = jasmine.createSpy('getCategories').and.callFake(response);
    TestBed.configureTestingModule({
      imports: [Category],
      providers: [provideRouter([]), { provide: CategoryService, useValue: { getCategories } }],
    });
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
  }
  function create() {
    fixture = TestBed.createComponent(Category);
    element = fixture.nativeElement;
    document.body.appendChild(element);
    fixture.detectChanges();
  }

  afterEach(() => {
    element.remove();
    jasmine.clock().uninstall();
  });

  const radio = (id: number) => element.querySelector<HTMLInputElement>(`#category-${id} input[type="radio"]`)!;
  const submit = () => {
    element.querySelector<HTMLButtonElement>('#category-submit')!.click();
    fixture.detectChanges();
  };

  it('shows skeletons while the categories load', () => {
    jasmine.clock().install();
    const pending = new Subject<CategoriesResponse>();
    setup(() => pending);
    create();
    // tg-loading só mostra o esqueleto depois do seu atraso padrão (300 ms).
    jasmine.clock().tick(300);
    fixture.detectChanges();
    expect(element.querySelectorAll('tg-skeleton').length).toBe(6);
    pending.next(page([category(1, 'Limpeza')]));
    pending.complete();
    fixture.detectChanges();
    expect(element.querySelectorAll('tg-skeleton').length).toBe(0);
    expect(element.querySelectorAll('#category-list label[tgCard]').length).toBe(1);
  });

  it('lists the categories as radio cards and continues to the chosen one', () => {
    setup();
    create();
    expect(element.querySelector('h1')?.textContent?.trim()).toBe('Qual é a sua área?');
    expect(element.querySelector('#category-1')?.textContent).toContain('Limpeza');
    radio(2).click();
    fixture.detectChanges();
    submit();
    expect(navigate).toHaveBeenCalledWith(['authenticate', 'category', 2, 'service']);
  });

  it('asks for a category on submit and focuses the first option', () => {
    setup();
    create();
    submit();
    expect(element.querySelector('tg-alert')?.textContent).toContain('Escolha uma categoria');
    expect(document.activeElement).toBe(radio(1));
    expect(navigate).not.toHaveBeenCalled();
  });

  it('shows an error with "Tentar de novo" and retries', () => {
    let calls = 0;
    setup(() => (++calls === 1 ? throwError(() => new Error('offline')) : of(page([category(1, 'Limpeza')]))));
    create();
    const alert = element.querySelector('tg-alert');
    expect(alert?.textContent).toContain('Não foi possível carregar as categorias');
    alert!.querySelector<HTMLButtonElement>('button')!.click();
    fixture.detectChanges();
    expect(getCategories).toHaveBeenCalledTimes(2);
    expect(element.querySelector('tg-alert')).toBeNull();
    expect(radio(1)).not.toBeNull();
  });

  it('preselects the category of the services already chosen', () => {
    setup();
    const service: Partial<ISubCategory> = { id: 11, categoryId: 2, name: 'Elétrica' };
    TestBed.inject(RegisterUser).user.update((user) => ({ ...user, services: [service] }));
    create();
    expect(radio(2).checked).toBeTrue();
    expect(radio(1).checked).toBeFalse();
  });
});
