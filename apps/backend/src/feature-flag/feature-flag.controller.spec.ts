import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { FeatureFlagController } from './feature-flag.controller';
import { CreateFeatureFlagDto } from './dto/create-feature-flag.dto';
import { UpdateFeatureFlagDto } from './dto/update-feature-flag.dto';
import {
  AdminCapability,
  roleHasCapabilities,
} from '../modules/admin/authorization/admin-permissions';
import { ADMIN_CAPABILITIES_KEY } from '../modules/admin/authorization/admin-roles.decorator';
import { AdminRole } from '@prisma/client';
import { AdminAuthGuard } from '../modules/admin/auth/admin-auth.guard';
import { AdminRolesGuard } from '../modules/admin/authorization/admin-roles.guard';

describe('FeatureFlagController', () => {
  it('requires administrator authentication and permission', () => {
    expect(Reflect.getMetadata('__guards__', FeatureFlagController)).toEqual([
      AdminAuthGuard,
      AdminRolesGuard,
    ]);
    expect(
      Reflect.getMetadata(ADMIN_CAPABILITIES_KEY, FeatureFlagController),
    ).toEqual([AdminCapability.ManageFeatureFlags]);
    for (const role of Object.values(AdminRole))
      expect(
        roleHasCapabilities(role, [AdminCapability.ManageFeatureFlags]),
      ).toBe(role === AdminRole.ADMINISTRATOR);
  });
  it('validates and trims input', async () => {
    const dto = plainToInstance(CreateFeatureFlagDto, {
      name: ' favorites ',
      isActive: false,
    });
    expect(await validate(dto)).toEqual([]);
    expect(dto.name).toBe('favorites');
    expect(
      (
        await validate(
          plainToInstance(CreateFeatureFlagDto, {
            name: ' ',
            description: 1,
            isActive: 'false',
          }),
        )
      ).length,
    ).toBe(3);
    expect(
      await validate(
        plainToInstance(UpdateFeatureFlagDto, { isActive: false }),
      ),
    ).toEqual([]);
    expect(
      (
        await validate(
          plainToInstance(UpdateFeatureFlagDto, {
            name: null,
            description: null,
            isActive: null,
          }),
        )
      ).length,
    ).toBe(3);
  });
});
