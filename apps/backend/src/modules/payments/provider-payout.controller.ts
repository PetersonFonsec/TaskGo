import { Body, Controller, Get, Put } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';

import { ProviderOnly } from '../../shared/decorators/roles.decorator';
import { User } from '../../shared/decorators/user.decorator';
import { UpdateProviderPayoutCommand } from './commands';
import { UpdateProviderPayoutDto } from './dto/update-provider-payout.dto';
import { GetProviderPayoutQuery } from './queries';

/** Payout account of the authenticated provider; never addressed by URL id. */
@ProviderOnly()
@Controller('provider/me/payout')
export class ProviderPayoutController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  findMine(@User('id') providerId: string) {
    return this.queryBus.execute(
      new GetProviderPayoutQuery(BigInt(providerId)),
    );
  }

  @Put()
  updateMine(
    @User('id') providerId: string,
    @Body() payload: UpdateProviderPayoutDto,
  ) {
    return this.commandBus.execute(
      new UpdateProviderPayoutCommand(BigInt(providerId), payload),
    );
  }
}
