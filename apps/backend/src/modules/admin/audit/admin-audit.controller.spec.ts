import { AdminAuditController } from './admin-audit.controller';
import { AdminAuditAction } from './admin-audit.contracts';

describe('AdminAuditController', () => {
  let controller: AdminAuditController;
  let service: {
    getDetail: jest.Mock;
    list: jest.Mock;
  };

  beforeEach(() => {
    service = {
      list: jest.fn().mockResolvedValue({ data: [], meta: { total: 0 } }),
      getDetail: jest.fn().mockResolvedValue({ auditLog: { id: '1' } }),
    };
    controller = new AdminAuditController(service as any);
  });

  it('delegates list queries to the audit service', async () => {
    const query = {
      operatorId: '42',
      action: AdminAuditAction.ProviderApproved,
    };

    await expect(controller.list(query)).resolves.toEqual({
      data: [],
      meta: { total: 0 },
    });
    expect(service.list).toHaveBeenCalledWith(query);
  });

  it('delegates detail lookup to the audit service', async () => {
    await expect(controller.getDetail('1')).resolves.toEqual({
      auditLog: { id: '1' },
    });
    expect(service.getDetail).toHaveBeenCalledWith('1');
  });

  it('does not expose mutation handlers', () => {
    expect((controller as any).create).toBeUndefined();
    expect((controller as any).update).toBeUndefined();
    expect((controller as any).delete).toBeUndefined();
    expect((controller as any).remove).toBeUndefined();
  });
});
