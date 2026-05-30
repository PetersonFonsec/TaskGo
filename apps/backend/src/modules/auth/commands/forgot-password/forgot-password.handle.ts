import { CommandHandler, EventBus, ICommandHandler } from "@nestjs/cqrs";
import { plainToClass } from "class-transformer";

import { ForgotPasswordEvent } from "../../events/forgot-password.event";
import { PrismaService } from "../../../../prisma/prisma.service";
import { ForgotPasswordCommand } from "./forgot-password.command";
import { AuthTokenService } from "../../auth-token.service";
import { NotFoundException } from "@nestjs/common";

@CommandHandler(ForgotPasswordCommand)
export class ForgotPasswordHandler implements ICommandHandler<ForgotPasswordCommand, void> {

  constructor(
    private readonly eventBus: EventBus,
    private readonly prismaService: PrismaService,
    private readonly tokenService: AuthTokenService,
  ) { }

  async execute(command: ForgotPasswordCommand): Promise<void> {
    const user = await this.prismaService.user.findUnique({ where: { email: command.email } });
    if (!user || !user.id) {
      throw new NotFoundException(`User with email ${command.email} not found`);
    }

    const token = await this.tokenService.createToken(user.id);
    const event = plainToClass(ForgotPasswordEvent, { ...user, token });

    this.eventBus.publish(event);
  }
}
