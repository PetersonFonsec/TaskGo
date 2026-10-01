import { Reflector } from '@nestjs/core';

import { AdminCapability } from '../authorization/admin-permissions';
import { ADMIN_CAPABILITIES_KEY } from '../authorization/admin-roles.decorator';
import { AdminFunnelMetricsController } from './admin-funnel-metrics.controller';
import { AdminFunnelMetricsService } from './admin-funnel-metrics.service';

describe('AdminFunnelMetricsController', () => {
  it('delegates funnel reads with the date range', async () => {
    const service = { getFunnel: jest.fn().mockResolvedValue({ weeks: [] }) };
    const controller = new AdminFunnelMetricsController(
      service as unknown as AdminFunnelMetricsService,
    );
    const query = {
      from: '2026-08-10T03:00:00.000Z',
      to: '2026-10-01T15:00:00.000Z',
    };

    await expect(controller.getFunnel(query)).resolves.toEqual({ weeks: [] });
    expect(service.getFunnel).toHaveBeenCalledWith(query);
  });

  it('requires the funnel metrics capability', () => {
    const capabilities = new Reflector().get(
      ADMIN_CAPABILITIES_KEY,
      AdminFunnelMetricsController.prototype.getFunnel,
    );

    expect(capabilities).toEqual([AdminCapability.ReadFunnelMetrics]);
  });
});
