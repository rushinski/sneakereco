import { pgPolicy } from 'drizzle-orm/pg-core';

import { sneakerecoAppRole } from '../shared/roles';
import { currentTenantScope, tenantAdminScope } from '../shared/rls';

import { contactMessages } from './contact-messages';
import { emailAuditLog } from './email-audit-log';
import { emailSubscribers } from './email-subscribers';

export const emailAuditLogAdminReadPolicy = pgPolicy('email_audit_log_admin_read', {
  for: 'select',
  to: sneakerecoAppRole,
  using: tenantAdminScope(emailAuditLog.tenantId),
}).link(emailAuditLog);

export const emailSubscribersPublicInsertPolicy = pgPolicy('email_subscribers_public_insert', {
  for: 'insert',
  to: sneakerecoAppRole,
  withCheck: currentTenantScope(emailSubscribers.tenantId),
}).link(emailSubscribers);

export const emailSubscribersAdminManagePolicy = pgPolicy('email_subscribers_admin_manage', {
  for: 'all',
  to: sneakerecoAppRole,
  using: tenantAdminScope(emailSubscribers.tenantId),
  withCheck: tenantAdminScope(emailSubscribers.tenantId),
}).link(emailSubscribers);

export const contactMessagesPublicInsertPolicy = pgPolicy('contact_messages_public_insert', {
  for: 'insert',
  to: sneakerecoAppRole,
  withCheck: currentTenantScope(contactMessages.tenantId),
}).link(contactMessages);

export const contactMessagesAdminReadPolicy = pgPolicy('contact_messages_admin_read', {
  for: 'select',
  to: sneakerecoAppRole,
  using: tenantAdminScope(contactMessages.tenantId),
}).link(contactMessages);
