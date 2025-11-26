import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FooterLinks } from './footer-links';

describe('FooterLinks', () => {
  let component: FooterLinks;
  let fixture: ComponentFixture<FooterLinks>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FooterLinks]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FooterLinks);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
