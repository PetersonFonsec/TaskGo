import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthTokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async createToken(id: bigint) {
    const idString = id.toString();

    const access_token = this.jwtService.sign(
      { id: idString },
      {
        expiresIn: this.configService.getOrThrow('auth.expiresIn'),
        subject: idString,
      },
    );

    return { access_token };
  }

  checkToken(token: string) {
    try {
      return this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException(
        'Invalid or expired authentication token',
      );
    }
  }

  decodeToken(token: string) {
    try {
      return this.jwtService.decode(token);
    } catch {
      throw new UnauthorizedException('Invalid authentication token');
    }
  }
}
