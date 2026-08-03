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
import { PaginationQuery } from '../../shared/services/pagination/pagination.interface';

import { AddressService } from './address.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { User } from '../../shared/decorators/user.decorator';
import { ParseBigIntPipe } from '../../shared/pipes/parse-bigint.pipe';

@Controller('user/me/addresses')
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @Post()
  create(
    @User('id') authenticatedUserId: string,
    @Body() createAddressDto: CreateAddressDto,
  ) {
    return this.addressService.create(
      BigInt(authenticatedUserId),
      createAddressDto,
    );
  }

  @Get()
  findAll(
    @User('id') authenticatedUserId: string,
    @Query() query: PaginationQuery,
  ) {
    return this.addressService.findAll(BigInt(authenticatedUserId), query);
  }

  @Get(':id')
  findOne(
    @User('id') authenticatedUserId: string,
    @Param('id', ParseBigIntPipe) id: bigint,
  ) {
    return this.addressService.findOne(BigInt(authenticatedUserId), id);
  }

  @Patch(':id')
  update(
    @User('id') authenticatedUserId: string,
    @Param('id', ParseBigIntPipe) id: bigint,
    @Body() updateAddressDto: UpdateAddressDto,
  ) {
    return this.addressService.update(
      BigInt(authenticatedUserId),
      id,
      updateAddressDto,
    );
  }

  @Delete(':id')
  remove(
    @User('id') authenticatedUserId: string,
    @Param('id', ParseBigIntPipe) id: bigint,
  ) {
    return this.addressService.remove(BigInt(authenticatedUserId), id);
  }
}
