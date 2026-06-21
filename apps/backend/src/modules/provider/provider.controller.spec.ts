import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  NotFoundException,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import request from 'supertest';
import { ProviderController } from './provider.controller';
import { ProviderService } from './provider.service';
import { ProviderAvailabilityQueryDto } from './dto/provider-availability.dto';
import { AuthTokenService } from '../auth/auth-token.service';
import Mediator from '../../shared/events/mediator';
import { FeatureFlagService } from '../../shared/services/feature-flag.service';

describe('ProviderController', () => {
  let controller: ProviderController;
  let providerService: ProviderService;
  let app: INestApplication;
  let authTokenService: AuthTokenService;
  let mediator: Mediator;
  let featureFlagService: FeatureFlagService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProviderController],
      providers: [
        {
          provide: ProviderService,
          useValue: {
            findAll: jest.fn(),
            findProvidersByCategorySlug: jest.fn(),
            getAvailability: jest.fn(),
          },
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

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('emits favorites.searchFilter.used when onlyFavorites filter is used', async () => {
    const mockRequest = {
      headers: { authorization: 'Bearer test-token' },
    } as any;
    (authTokenService.decodeToken as jest.Mock).mockReturnValue({ id: 123 });
    (providerService.findAll as jest.Mock).mockResolvedValue([{ id: 1 }]);

    const result = await controller.findAll('true', mockRequest);

    expect(authTokenService.checkToken).toHaveBeenCalledWith('test-token');
    expect(mediator.publish).toHaveBeenCalledWith(
      'favorites.searchFilter.used',
      expect.objectContaining({ clientId: 123, resultCount: 1 }),
    );
    expect(result).toEqual([{ id: 1 }]);
  });

  it('throws NotFoundException when favorites MVP feature is disabled', async () => {
    (featureFlagService.isFavoritesMvpEnabled as jest.Mock).mockReturnValue(
      false,
    );

    const mockRequest = {
      headers: { authorization: 'Bearer test-token' },
    } as any;

    await expect(controller.findAll('true', mockRequest)).rejects.toThrow(
      NotFoundException,
    );
  });

  describe('availability query validation', () => {
    it('accepts valid from, to, and serviceId query params', async () => {
      const dto = plainToInstance(ProviderAvailabilityQueryDto, {
        from: '2026-06-21',
        to: '2026-06-28',
        serviceId: 'service-123',
      });

      await expect(validate(dto)).resolves.toHaveLength(0);
    });

    it('rejects a missing from query param', async () => {
      const dto = plainToInstance(ProviderAvailabilityQueryDto, {
        to: '2026-06-28',
        serviceId: 'service-123',
      });

      const errors = await validate(dto);

      expect(errors.some((error) => error.property === 'from')).toBe(true);
    });

    it('rejects a missing to query param', async () => {
      const dto = plainToInstance(ProviderAvailabilityQueryDto, {
        from: '2026-06-21',
        serviceId: 'service-123',
      });

      const errors = await validate(dto);

      expect(errors.some((error) => error.property === 'to')).toBe(true);
    });

    it('rejects invalid date formats', async () => {
      const dto = plainToInstance(ProviderAvailabilityQueryDto, {
        from: '2026/06/21',
        to: 'June 28, 2026',
      });

      const errors = await validate(dto);

      expect(errors.map((error) => error.property)).toEqual(
        expect.arrayContaining(['from', 'to']),
      );
    });
  });

  describe('GET /provider/:id/availability', () => {
    it('binds a valid availability query DTO and returns normalized days and slots', async () => {
      const response = {
        providerId: '42',
        timezone: 'America/Sao_Paulo',
        days: [
          {
            date: '2026-06-22',
            available: true,
            slots: [
              {
                startsAt: '2026-06-22T12:00:00.000Z',
                endsAt: '2026-06-22T13:00:00.000Z',
                serviceId: '101',
                label: '09:00',
                available: true,
              },
            ],
          },
          {
            date: '2026-06-23',
            available: false,
            slots: [],
          },
        ],
      };
      (providerService.getAvailability as jest.Mock).mockResolvedValue(
        response,
      );

      await request(app.getHttpServer())
        .get('/provider/42/availability')
        .query({
          from: '2026-06-21',
          to: '2026-06-28',
          serviceId: 'service-123',
        })
        .expect(200)
        .expect(response);

      expect(providerService.getAvailability).toHaveBeenCalledWith('42', {
        from: '2026-06-21',
        to: '2026-06-28',
        serviceId: 'service-123',
      });
    });

    it('does not shadow the by-category route', async () => {
      (
        providerService.findProvidersByCategorySlug as jest.Mock
      ).mockResolvedValue([]);

      await request(app.getHttpServer())
        .get('/provider/by-category/limpeza')
        .expect(200)
        .expect([]);

      expect(providerService.findProvidersByCategorySlug).toHaveBeenCalledWith(
        'limpeza',
      );
      expect(providerService.getAvailability).not.toHaveBeenCalled();
    });

    it('rejects missing required availability query params', async () => {
      await request(app.getHttpServer())
        .get('/provider/42/availability')
        .query({ to: '2026-06-28' })
        .expect(400);
    });

    it('rejects invalid date-only availability query params', async () => {
      await request(app.getHttpServer())
        .get('/provider/42/availability')
        .query({ from: '2026-06-21T10:00:00Z', to: '2026-06-28' })
        .expect(400);
    });
  });
});
