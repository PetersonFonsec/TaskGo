import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ProviderController } from './provider.controller';
import { ProviderService } from './provider.service';
import { AuthTokenService } from '../auth/auth-token.service';
import Mediator from '../../shared/events/mediator';
import { FeatureFlagService } from '../../shared/services/feature-flag.service';

describe('ProviderController', () => {
  let controller: ProviderController;
  let providerService: ProviderService;
  let authTokenService: AuthTokenService;
  let mediator: Mediator;
  let featureFlagService: FeatureFlagService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProviderController],
      providers: [
        {
          provide: ProviderService,
          useValue: { findAll: jest.fn() },
        },
        {
          provide: AuthTokenService,
          useValue: { checkToken: jest.fn(), decodeToken: jest.fn() },
        },
        {
          provide: Mediator,
          useValue: { publish: jest.fn() },
        },
        {
          provide: FeatureFlagService,
          useValue: { isFavoritesMvpEnabled: jest.fn().mockReturnValue(true) },
        },
      ],
    }).compile();

    controller = module.get<ProviderController>(ProviderController);
    providerService = module.get<ProviderService>(ProviderService);
    authTokenService = module.get<AuthTokenService>(AuthTokenService);
    mediator = module.get<Mediator>(Mediator);
    featureFlagService = module.get<FeatureFlagService>(FeatureFlagService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('emits favorites.searchFilter.used when onlyFavorites filter is used', async () => {
    const mockRequest = { headers: { authorization: 'Bearer test-token' } } as any;
    (authTokenService.decodeToken as jest.Mock).mockReturnValue({ id: 123 });
    (providerService.findAll as jest.Mock).mockResolvedValue([{ id: 1 }]);

    const result = await controller.findAll('true', mockRequest);

    expect(authTokenService.checkToken).toHaveBeenCalledWith('test-token');
    expect(mediator.publish).toHaveBeenCalledWith('favorites.searchFilter.used', expect.objectContaining({ clientId: 123, resultCount: 1 }));
    expect(result).toEqual([{ id: 1 }]);
  });

  it('throws NotFoundException when favorites MVP feature is disabled', async () => {
    (featureFlagService.isFavoritesMvpEnabled as jest.Mock).mockReturnValue(false);

    const mockRequest = { headers: { authorization: 'Bearer test-token' } } as any;

    await expect(controller.findAll('true', mockRequest)).rejects.toThrow(NotFoundException);
  });
});
