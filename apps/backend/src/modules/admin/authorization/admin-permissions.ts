import { AdminRole } from '@prisma/client';

export enum AdminCapability {
  ManageDisputes = 'disputes:manage',
  ManageCatalog = 'catalog:manage',
  ManageAdministrativeUsers = 'admin-users:manage',
  ReadProviders = 'providers:read',
  ExecuteProviderDecisions = 'providers:decide',
  ReadProviderDashboard = 'provider-dashboard:read',
  ReadAuditLog = 'audit-log:read',
}

export const ADMIN_ROLE_CAPABILITIES: Record<
  AdminRole,
  readonly AdminCapability[]
> = {
  [AdminRole.ADMINISTRATOR]: [
    AdminCapability.ManageDisputes,
    AdminCapability.ManageCatalog,
    AdminCapability.ManageAdministrativeUsers,
    AdminCapability.ReadProviders,
    AdminCapability.ExecuteProviderDecisions,
    AdminCapability.ReadProviderDashboard,
    AdminCapability.ReadAuditLog,
  ],
  [AdminRole.SUPPORT]: [
    AdminCapability.ManageDisputes,
    AdminCapability.ReadProviders,
    AdminCapability.ReadProviderDashboard,
  ],
  [AdminRole.FINANCE]: [],
  [AdminRole.MODERATOR]: [],
};

export function roleHasCapabilities(
  role: AdminRole,
  capabilities: readonly AdminCapability[],
) {
  const granted = ADMIN_ROLE_CAPABILITIES[role];
  if (!granted) return false;

  return capabilities.every((capability) => granted.includes(capability));
}
