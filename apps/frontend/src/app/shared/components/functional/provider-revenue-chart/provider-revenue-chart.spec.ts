import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProviderRevenueChartComponent } from './provider-revenue-chart';

describe('ProviderRevenueChartComponent', () => {
  let component: ProviderRevenueChartComponent;
  let fixture: ComponentFixture<ProviderRevenueChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProviderRevenueChartComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ProviderRevenueChartComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('data', [
      { month: 'Jan', revenue: 100 },
      { month: 'Fev', revenue: 200 },
    ]);
    fixture.detectChanges();
  });

  it('scales revenue bars relative to the largest month', () => {
    expect(component.barHeight(100)).toBe(50);
    expect(component.barHeight(200)).toBe(100);
  });

  it('handles an empty series without division by zero', () => {
    fixture.componentRef.setInput('data', []);
    expect(component.barHeight(0)).toBe(0);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
