-- Application role: subject to Row Level Security
CREATE ROLE sneakereco_app LOGIN PASSWORD 'app_password';

-- System role: bypasses RLS for migrations, background jobs, cross-tenant ops
CREATE ROLE sneakereco_system LOGIN PASSWORD 'system_password';

-- Grant database access
GRANT ALL PRIVILEGES ON DATABASE sneakereco_dev TO sneakereco_app;
GRANT ALL PRIVILEGES ON DATABASE sneakereco_dev TO sneakereco_system;

-- Grant schema access (this is what's missing)
GRANT ALL ON SCHEMA public TO sneakereco_app;
GRANT ALL ON SCHEMA public TO sneakereco_system;

-- RLS setting for system role
ALTER ROLE sneakereco_system SET row_security TO off;