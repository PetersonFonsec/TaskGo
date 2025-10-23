import { TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { BackButtonDirective } from './back-button.directive';

describe('BackButtonDirective', () => {
  let directive: BackButtonDirective;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule],
    })
      .compileComponents();

    TestBed.runInInjectionContext(() => {
      directive = new BackButtonDirective();
    });
  });

  it('should create an instance', () => {
    expect(directive).toBeTruthy();
  });
});
