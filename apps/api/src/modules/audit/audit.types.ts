export interface AuditEventRecord {
  id: string;
  eventName: string;
  occurredAt: string;
  actorType?: string;
  actorId?: string;
  tenantId?: string;
  metadata: Record<string, unknown>;
}