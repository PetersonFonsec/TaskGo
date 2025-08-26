import { BadRequestException, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

@Injectable()
export class AuthTokenService {
  constructor(
    private readonly jwtService: JwtService,
  ) { }

  async createToken(user) {
    delete user.password;

    const access_token = this.jwtService.sign(user, {
      expiresIn: process.env.EXPIRES_IN,
      subject: user.id.toString()
    });

    return { access_token }
  }

  checkToken(token: string) {
    try {
      return this.jwtService.verify(token)
    } catch (error) {
      throw new BadRequestException(error)
    }
  }

  decodeToken(token: string) {
    try {
      return this.jwtService.decode(token)
    } catch (error) {
      throw new BadRequestException(error)
    }
  }
}
