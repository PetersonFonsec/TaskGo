import { BadRequestException } from '@nestjs/common';

import { ParseBigIntPipe } from './parse-bigint.pipe';

describe('ParseBigIntPipe', () => {
  const pipe = new ParseBigIntPipe();

  it('parses a positive bigint identifier', () => {
    expect(pipe.transform('9223372036854775807')).toBe(9223372036854775807n);
  });

  it.each(['', '0', '-1', '1.5', 'abc', ' 1'])('rejects %p', (value) => {
    expect(() => pipe.transform(value)).toThrow(BadRequestException);
  });
});
