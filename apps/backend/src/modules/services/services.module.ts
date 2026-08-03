import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { ServiceCommandHandlers } from './commands';
import { ServiceQueryHandlers } from './queries';
import { ServicesController } from './services.controller';

@Module({
  imports: [CqrsModule],
  controllers: [ServicesController],
  providers: [...ServiceCommandHandlers, ...ServiceQueryHandlers],
})
export class ServicesModule {}
