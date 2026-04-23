export class CustomerRegisteredEvent {
  constructor(
    readonly cognitoSub: string,
    readonly email: string,
    readonly tenantId: string,
  ) {}
}
