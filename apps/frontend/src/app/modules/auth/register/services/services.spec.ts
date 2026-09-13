import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { CategoryService } from '@shared/service/category/category';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Services } from './services';

describe('Services', () => {
  let component: Services;
  let fixture: ComponentFixture<Services>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Services],
      providers: [
        provideRouter([]),
        {
          provide: CategoryService,
          useValue: { getCategoryById: () => of({ subcategories: [] }) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Services);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
