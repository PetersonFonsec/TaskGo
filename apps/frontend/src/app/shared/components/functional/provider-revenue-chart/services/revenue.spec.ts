import { TestBed } from '@angular/core/testing';

import { Revenue } from './revenue';

describe('Revenue', () => {
  let service: Revenue;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Revenue);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
