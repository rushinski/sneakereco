import { pgPolicy } from "drizzle-orm/pg-core";

import { rdkAppRole } from "../shared/roles";
import { currentTenantScope, tenantAdminScope } from "../shared/rls";
import { contactMessages } from "./contact-messages";
import { emailAuditLog } from "./email-audit-log";
import { emailSubscribers } from "./email-subscribers";

export const emailAuditLogAdminReadPolicy = pgPolicy(
  "email_audit_log_admin_read",
  {
    for: "select",
    to: rdkAppRole,
    using: tenantAdminScope(emailAuditLog.tenantId),
  },
).link(emailAuditLog);

export const emailSubscribersPublicInsertPolicy = pgPolicy(
  "email_subscribers_public_insert",
  {
    for: "insert",
    to: rdkAppRole,
    withCheck: currentTenantScope(emailSubscribers.tenantId),
  },
).link(emailSubscribers);

export const emailSubscribersAdminManagePolicy = pgPolicy(
  "email_subscribers_admin_manage",
  {
    for: "all",
    to: rdkAppRole,
    using: tenantAdminScope(emailSubscribers.tenantId),
    withCheck: tenantAdminScope(emailSubscribers.tenantId),
  },
).link(emailSubscribers);

export const contactMessagesPublicInsertPolicy = pgPolicy(
  "contact_messages_public_insert",
  {
    for: "insert",
    to: rdkAppRole,
    withCheck: currentTenantScope(contactMessages.tenantId),
  },
).link(contactMessages);

export const contactMessagesAdminReadPolicy = pgPolicy(
  "contact_messages_admin_read",
  {
    for: "select",
    to: rdkAppRole,
    using: tenantAdminScope(contactMessages.tenantId),
  },
).link(contactMessages);
