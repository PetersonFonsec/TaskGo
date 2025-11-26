import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InstitutionalPage } from './institutional-page';

describe('InstitutionalPage', () => {
  let component: InstitutionalPage;
  let fixture: ComponentFixture<InstitutionalPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InstitutionalPage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InstitutionalPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
