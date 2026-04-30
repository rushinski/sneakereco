export interface DomainEvent<TPayload = Record<string, unknown>> {
  id: string;
  name: string;
  aggregateType: string;
  aggregateId: string;
  occurredAt: string;
  payload: TPayload;
}

export interface PersistedDomainEvent<TPayload = Record<string, unknown>>
  extends DomainEvent<TPayload> {
  status: 'pending' | 'dispatched' | 'failed';
  failureReason?: string;
}