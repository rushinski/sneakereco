export class ApproveApplicationDto {
  reviewedByAdminUserId!: string;
}

export class DenyApplicationDto {
  reviewedByAdminUserId!: string;
  reason!: string;
}
