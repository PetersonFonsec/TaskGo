import { ExecutionContext, createParamDecorator } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UserTokenI } from "../interfaces/user-token";

export const User = createParamDecorator((field, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest();
  if (field && request[field]) return request[field]

  const jwt = new JwtService();
  const token = jwt.decode<UserTokenI>(request.headers.authorization.split(" ")[1]);

  return token;
})
