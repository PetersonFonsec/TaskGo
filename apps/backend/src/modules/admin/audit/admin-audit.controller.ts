import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';

import { Public } from '../../../shared/decorators/public.decorator';
import { AdminCapability } from '../authorization/admin-permissions';
import { AdminPermissions } from '../authorization/admin-roles.decorator';
import { AdminRolesGuard } from '../authorization/admin-roles.guard';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { AdminAuditService } from './admin-audit.service';
import { AdminAuditLogQueryDto } from './dto/admin-audit-log-query.dto';

@Public()
@UseGuards(AdminAuthGuard, AdminRolesGuard)
@Controller('admin/audit-logs')
export class AdminAuditController {
  constructor(private readonly auditService: AdminAuditService) {}

  @AdminPermissions(AdminCapability.ReadAuditLog)
  @Get()
  list(@Query() query: AdminAuditLogQueryDto) {
    return this.auditService.list(query);
  }

  @AdminPermissions(AdminCapability.ReadAuditLog)
  @Get(':id')
  getDetail(@Param('id') id: string) {
    return this.auditService.getDetail(id);
  }
}
