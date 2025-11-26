import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FullModal } from './full-modal';

describe('FullModal', () => {
  let component: FullModal;
  let fixture: ComponentFixture<FullModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FullModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FullModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
