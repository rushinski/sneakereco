# Schema And RLS Alignment Design

## Purpose

This spec defines Stage 4 of the remediation effort: align the database schema and row-level security model with the superpowers auth/platform design so that active data ownership, actor boundaries, and table lifecycle are explicit.

The current schema contains a mix of newer auth/platform-aligned tables and legacy shapes that no longer match the approved model. RLS coverage is also incomplete and some policy assumptions still reflect the older shared-user model.

## Problem Statement

The current database state has four classes of ambiguity:

- some tables are clearly legacy but still exist
- some tables are active but modeled as temporary bridge structures
- some active exported tables have no explicit policy coverage
- some RLS helpers and assumptions still reflect the old actor model

Without resolving these ambiguities, application-layer cleanup and security work will rest on unclear storage boundaries.

## Goal

Create one explicit schema and policy alignment model that answers:

- which tables are active
- which tables are transitional
- which tables are deprecated
- which tables should be retired
- which tables use RLS
- which tables intentionally do not use RLS and why
- which policy assumptions must change to match the approved actor model

## Non-Goals

Out of scope:

- performing every data migration immediately
- redesigning unrelated catalog/order/product behavior beyond identity and tenant-boundary implications
- frontend or BFF security redesign
- full application-layer slice restructuring

## Ownership Model

The schema must clearly separate:

- platform-global data
- tenant-scoped application data
- auth/session control data
- operational and audit data
- internal/system-only workflow data

RLS decisions should follow those ownership boundaries instead of being applied inconsistently table by table.

## Table Lifecycle Matrix

This stage should produce an explicit table-status matrix with at least these statuses:

- `active`
- `transitional`
- `deprecated`
- `retire`

### Immediate legacy candidates

The current likely legacy set includes:

- `users`
- `tenant_members`
- `tenant_onboarding`

These no longer fit the approved split between:

- `admin_users`
- `customer_users`
- `admin_tenant_relationships`
- `tenant_applications`
- `tenant_setup_invitations`

### Transitional bridge candidates

Some current single-current-row config tables may remain temporarily but need explicit classification as bridge structures rather than long-term schema truth.

Representative examples:

- `tenant_theme_config`
- `tenant_email_config`

This spec must decide whether each such table is:

- still active by design
- transitional pending versioned replacement
- deprecated and ready for retirement planning

## RLS Alignment Goals

### Active tenant-scoped tables

Every active tenant-scoped table must have an intentional policy decision:

- public read
- customer own-data access
- tenant-admin access
- system-only access
- no RLS by design with explicit justification

Silence is not acceptable. Missing policy coverage must be surfaced explicitly.

### Auth and session tables

Auth/session tables need a clearer decision model because not all of them should behave like ordinary tenant content tables.

The spec should define policy intent for:

- `auth_sessions`
- `auth_subject_revocations`
- `auth_session_lineage_revocations`
- invitation and onboarding workflow tables

### Platform-global tables

Platform-global tables may intentionally avoid tenant RLS, but that must be explicit. They should instead be classified under platform-admin, system, or internal-worker access rules as appropriate.

## Actor Model Alignment

The RLS helper layer must match the approved actor model rather than the older generic-user model.

The policy system should align with the active actors:

- `platform_admin`
- `tenant_admin`
- `customer`
- `system`
- `worker`
- `webhook` where applicable at the operational layer

If the current RLS helpers assume a generic shared user identity or oversimplified role string, this spec must call that out and define the replacement direction.

## Questions This Spec Must Resolve

### 1. Deprecated immediately

Which tables are already outside the approved model and should no longer be used by new code?

### 2. Transitional by design

Which tables remain temporarily acceptable as bridge structures while later migration work is scheduled?

### 3. Active but under-protected

Which active tables are exported and used but still missing policy coverage or explicit access rules?

### 4. Policy assumptions tied to the old model

Which current RLS helpers or policies still depend on:

- generic shared users
- old tenant-member semantics
- ambiguous admin/customer role assumptions

## Workstreams

### Workstream A: Table inventory and status map

Produce the active/transitional/deprecated/retire matrix for all relevant auth/platform tables.

### Workstream B: Ownership classification

Classify tables by platform-global, tenant-scoped, auth/session-scoped, operational, or system-only ownership.

### Workstream C: RLS coverage audit

Identify every active exported table that lacks intentional policy coverage or explicit non-RLS justification.

### Workstream D: Actor-model policy alignment

Define how the RLS helper layer and policy assumptions should evolve to match the superpowers actor model.

## Success Criteria

This stage is successful when:

1. There is one explicit table lifecycle matrix.
2. The active actor model used by RLS matches the approved auth/platform model.
3. Active tables have intentional RLS decisions, including explicit non-RLS cases.
4. Deprecated and transitional tables are clearly identified so later implementation planning is unambiguous.
5. Schema cleanup and policy remediation can proceed in later implementation work without guessing at ownership or access rules.

## Risks

### Risk: Table status remains ambiguous

Mitigation:

- require every relevant table to receive an explicit status

### Risk: Policy work stays tied to old actor assumptions

Mitigation:

- align helpers and policy reasoning to the approved actor model before broad policy edits

### Risk: RLS gaps remain invisible

Mitigation:

- treat missing policy coverage as a first-class inventory outcome, not an incidental discovery during implementation

## Handoff To Later Stages

This stage should leave the schema and policy landscape explicit enough that implementation planning can safely retire old tables, complete missing policies, and migrate application code without schema ambiguity.
