-- Create user if not exists
DO
$do$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles
      WHERE  rolname = 'holitime') THEN
      CREATE ROLE holitime LOGIN PASSWORD 'holitime';
   END IF;
END
$do$;

-- Create database if not exists
SELECT 'CREATE DATABASE holitime OWNER holitime'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'holitime');

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE holitime TO holitime;
