import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Provider } from './provider';

describe('Provider', () => {
  let component: Provider;
  let fixture: ComponentFixture<Provider>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Provider]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Provider);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
