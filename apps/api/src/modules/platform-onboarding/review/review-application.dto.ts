export class ApproveApplicationDto {
  reviewedByAdminUserId!: string;
}

export class DenyApplicationDto {
  reviewedByAdminUserId!: string;
  denialReason!: string;
}
