import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';

import { PaginationQuery } from '../../shared/services/pagination/pagination.interface';
import { Public } from '../../shared/decorators/public.decorator';
import { ParseBigIntPipe } from '../../shared/pipes/parse-bigint.pipe';
import {
  CreateServiceCommand,
  RemoveServiceCommand,
  UpdateServiceCommand,
} from './commands';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { GetServiceQuery, ListServicesQuery } from './queries';

@Controller('services')
export class ServicesController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  create(@Body() payload: CreateServiceDto) {
    return this.commandBus.execute(new CreateServiceCommand(payload));
  }

  @Public()
  @Get()
  findAll(@Query() pagination: PaginationQuery) {
    return this.queryBus.execute(new ListServicesQuery(pagination));
  }

  @Public()
  @Get(':id')
  findOne(@Param('id', ParseBigIntPipe) id: bigint) {
    return this.queryBus.execute(new GetServiceQuery(id));
  }

  @Patch(':id')
  update(
    @Param('id', ParseBigIntPipe) id: bigint,
    @Body() payload: UpdateServiceDto,
  ) {
    return this.commandBus.execute(new UpdateServiceCommand(id, payload));
  }

  @Delete(':id')
  remove(@Param('id', ParseBigIntPipe) id: bigint) {
    return this.commandBus.execute(new RemoveServiceCommand(id));
  }
}
