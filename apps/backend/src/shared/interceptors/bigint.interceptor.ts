import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export function convertBigInt(obj: any): any {
  if (typeof obj === 'bigint') {
    return obj.toString();
  } else if (obj instanceof Date) {
    return obj.toISOString();
  } else if (obj?.constructor?.name === 'Decimal') {
    return Number(obj.toString());
  } else if (Array.isArray(obj)) {
    return obj.map(convertBigInt);
  } else if (obj && typeof obj === 'object') {
    const newObj: any = {};
    for (const key of Object.keys(obj)) {
      const value = obj[key];
      newObj[key] = convertBigInt(value);
    }
    return newObj;
  }
  return obj;
}

@Injectable()
export class BigIntInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(map(data => convertBigInt(data)));
  }
}
