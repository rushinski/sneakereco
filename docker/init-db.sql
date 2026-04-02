-- Application role: subject to Row Level Security
CREATE ROLE sneakereco_app LOGIN PASSWORD 'app_password';

-- System role: bypasses RLS for migrations, background jobs, cross-tenant ops
CREATE ROLE sneakereco_system LOGIN PASSWORD 'system_password';

-- Grant schema access to both roles
GRANT ALL PRIVILEGES ON DATABASE sneakereco_dev TO sneakereco_app;
GRANT ALL PRIVILEGES ON DATABASE sneakereco_dev TO sneakereco_system;

-- System role bypasses RLS
ALTER ROLE sneakereco_system SET row_security TO off;