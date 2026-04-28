import { pgRole } from 'drizzle-orm/pg-core';

// These roles are expected to be provisioned by infrastructure because
// the current Drizzle role API does not model LOGIN/BYPASSRLS details.
export const sneakerecoAppRole = pgRole('sneakereco_app').existing();
export const sneakerecoSystemRole = pgRole('sneakereco_system').existing();
