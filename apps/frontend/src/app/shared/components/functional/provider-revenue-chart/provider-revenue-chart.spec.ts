import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProviderRevenueChart } from './provider-revenue-chart';

describe('ProviderRevenueChart', () => {
  let component: ProviderRevenueChart;
  let fixture: ComponentFixture<ProviderRevenueChart>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProviderRevenueChart],
    }).compileComponents();

    fixture = TestBed.createComponent(ProviderRevenueChart);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
