import { AdminAuthGuard } from '../admin/auth/admin-auth.guard';
import { AdminRolesGuard } from '../admin/authorization/admin-roles.guard';
import { ADMIN_CAPABILITIES_KEY } from '../admin/authorization/admin-roles.decorator';
import {
  AdminCapability,
  roleHasCapabilities,
} from '../admin/authorization/admin-permissions';
import { AdminRole } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

describe('CategoriesController', () => {
  let controller: CategoriesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [{ provide: CategoriesService, useValue: {} }],
    })
      .overrideGuard(AdminAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AdminRolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CategoriesController>(CategoriesController);
  });

  it('requires catalog capability on every write', () => {
    for (const method of ['create', 'update', 'remove'] as const) {
      expect(
        Reflect.getMetadata(
          ADMIN_CAPABILITIES_KEY,
          CategoriesController.prototype[method],
        ),
      ).toEqual([AdminCapability.ManageCatalog]);
    }
    expect(
      roleHasCapabilities(AdminRole.ADMINISTRATOR, [
        AdminCapability.ManageCatalog,
      ]),
    ).toBe(true);
    expect(
      roleHasCapabilities(AdminRole.SUPPORT, [AdminCapability.ManageCatalog]),
    ).toBe(false);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
