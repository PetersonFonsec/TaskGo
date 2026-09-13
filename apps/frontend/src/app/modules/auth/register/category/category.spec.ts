import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { CategoryService } from '@shared/service/category/category';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Category } from './category';

describe('Category', () => {
  let component: Category;
  let fixture: ComponentFixture<Category>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Category],
      providers: [
        provideRouter([]),
        { provide: CategoryService, useValue: { getCategories: () => of({ data: [] }) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Category);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
