import { Injectable } from '@nestjs/common';
import { CreateFeatureFlagDto } from './dto/create-feature-flag.dto';
import { UpdateFeatureFlagDto } from './dto/update-feature-flag.dto';

@Injectable()
export class FeatureFlagService {
  create(_createFeatureFlagDto: CreateFeatureFlagDto) {
    return 'This action adds a new featureFlag';
  }

  findAll() {
    return `This action returns all featureFlag`;
  }

  findOne(id: number) {
    return `This action returns a #${id} featureFlag`;
  }

  update(id: number, _updateFeatureFlagDto: UpdateFeatureFlagDto) {
    return `This action updates a #${id} featureFlag`;
  }

  remove(id: number) {
    return `This action removes a #${id} featureFlag`;
  }
}
