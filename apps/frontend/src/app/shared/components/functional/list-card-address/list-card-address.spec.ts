import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListCardAddress } from './list-card-address';

describe('ListCardAddress', () => {
  let component: ListCardAddress;
  let fixture: ComponentFixture<ListCardAddress>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListCardAddress]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListCardAddress);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
