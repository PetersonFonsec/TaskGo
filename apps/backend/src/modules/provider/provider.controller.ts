import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { ProviderAvailabilityQueryDto } from './dto/provider-availability.dto';
import { ProviderSearchQueryDto } from './dto/provider-search-query.dto';
import { Public } from '../../shared/decorators/public.decorator';
import { OptionalAuth } from '../../shared/decorators/optional-auth.decorator';
import { User } from '../../shared/decorators/user.decorator';
import { ProviderSearchFilters } from './provider-search';
import { ParseBigIntPipe } from '../../shared/pipes/parse-bigint.pipe';
import {
  CreateProviderCommand,
  RemoveProviderCommand,
  UpdateProviderCommand,
} from './commands';
import {
  GetProviderAvailabilityQuery,
  GetProviderQuery,
  GetProvidersByCategoryQuery,
  ListProvidersQuery,
} from './queries';

@Controller('provider')
export class ProviderController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  create(@Body() createProviderDto: CreateProviderDto) {
    return this.commandBus.execute(
      new CreateProviderCommand(createProviderDto),
    );
  }

  @OptionalAuth()
  @Get()
  findAll(
    @Query() filters: ProviderSearchQueryDto,
    @Query('onlyFavorites') onlyFavorites?: string,
    @User('id') authenticatedUserId?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
  ) {
    return this.queryBus.execute(
      new ListProvidersQuery(
        onlyFavorites === 'true',
        authenticatedUserId,
        {
          lat,
          lng,
        },
        filters as ProviderSearchFilters,
      ),
    );
  }

  @Public()
  @Get(':id/availability')
  getAvailability(
    @Param('id') id: string,
    @Query() query: ProviderAvailabilityQueryDto,
  ) {
    return this.queryBus.execute(new GetProviderAvailabilityQuery(id, query));
  }

  @OptionalAuth()
  @Get('by-category/:slug')
  findByCategory(
    @Param('slug') slug: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query() filters?: ProviderSearchQueryDto,
    @Query('onlyFavorites') onlyFavorites?: string,
    @User('id') authenticatedUserId?: string,
  ) {
    return this.queryBus.execute(
      new GetProvidersByCategoryQuery(
        slug,
        { lat, lng },
        filters as ProviderSearchFilters,
        onlyFavorites === 'true',
        authenticatedUserId,
      ),
    );
  }

  @Public()
  @Get(':id')
  findOne(@Param('id', ParseBigIntPipe) id: bigint) {
    return this.queryBus.execute(new GetProviderQuery(id));
  }

  @Patch(':id')
  update(
    @Param('id', ParseBigIntPipe) id: bigint,
    @Body() updateProviderDto: UpdateProviderDto,
  ) {
    return this.commandBus.execute(
      new UpdateProviderCommand(id, updateProviderDto),
    );
  }

  @Delete(':id')
  remove(@Param('id', ParseBigIntPipe) id: bigint) {
    return this.commandBus.execute(new RemoveProviderCommand(id));
  }
}
