import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProviderProfileSummary } from './provider-profile-summary';

describe('ProviderProfileSummary', () => {
  let component: ProviderProfileSummary;
  let fixture: ComponentFixture<ProviderProfileSummary>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProviderProfileSummary]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProviderProfileSummary);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
