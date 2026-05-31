import { ExecutionContext, createParamDecorator } from "@nestjs/common";
import { TOKEN_KEY } from "../../modules/auth/auth.guard";

export const User = createParamDecorator((field, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest();
  const token = request[TOKEN_KEY];
  if (!token) return null;
  if (field) return token[field];
  return token;
});
