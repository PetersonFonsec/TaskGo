import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfileHeaderInfo } from './profile-header-info';

describe('ProfileHeaderInfo', () => {
  let component: ProfileHeaderInfo;
  let fixture: ComponentFixture<ProfileHeaderInfo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileHeaderInfo]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProfileHeaderInfo);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
