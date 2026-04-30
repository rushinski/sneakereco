export interface DomainEvent<TPayload = Record<string, unknown>> {
  id: string;
  name: string;
  aggregateType: string;
  aggregateId: string;
  occurredAt: string;
  payload: TPayload;
}