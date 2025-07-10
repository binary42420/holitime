// scripts/validate-schema.js
const { Client } = require('pg');

// --- Configuration ---
// Load database connection details from environment variables
// Ensure you have a .env file with:
// PGHOST=your_db_host
// PGUSER=your_db_user
// PGPASSWORD=your_db_password
// PGDATABASE=your_db_name
// PGPORT=your_db_port (optional, defaults to 5432)
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

const client = new Client({
  host: process.env.PGHOST,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5432,
  ssl: isProduction
    ? {
        rejectUnauthorized: true,
        // In a real production environment, you would also likely need to provide
        // the CA certificate like this:
        // ca: process.env.PG_CA_CERT,
      }
    : {
        rejectUnauthorized: false, // For local/dev environments ONLY
      },
});

// --- Expected Schema Definition ---
// This object is your "source of truth". It describes what your database
// *should* look like. Add all tables, their columns, expected data types,
// nullability, indexes, and constraints here.
const expectedSchema = {
  tables: {
    users: {
      columns: {
        id: { type: 'uuid', nullable: false },
        email: { type: 'character varying', nullable: false },
        password_hash: { type: 'character varying', nullable: false },
        name: { type: 'character varying', nullable: false },
        role: { type: 'character varying', nullable: false },
        avatar: { type: 'character varying', nullable: true },
        is_active: { type: 'boolean', nullable: true },
        certifications: { type: 'text[]', nullable: true },
        performance: { type: 'numeric', nullable: true }, // Note: DECIMAL in SQL maps to NUMERIC in information_schema
        location: { type: 'character varying', nullable: true },
        crew_chief_eligible: { type: 'boolean', nullable: true },
        fork_operator_eligible: { type: 'boolean', nullable: true },
        client_company_id: { type: 'uuid', nullable: true },
        created_at: { type: 'timestamp with time zone', nullable: true },
        updated_at: { type: 'timestamp with time zone', nullable: true },
        last_login: { type: 'timestamp with time zone', nullable: true }
      },
      indexes: ['idx_users_email', 'idx_users_role', 'idx_users_client_company', 'idx_users_crew_chief_eligible'],
      constraints: ['fk_users_client_company']
    },
    clients: {
      columns: {
        id: { type: 'uuid', nullable: false },
        company_name: { type: 'character varying', nullable: false },
        company_address: { type: 'text', nullable: true },
        contact_phone: { type: 'character varying', nullable: true },
        contact_email: { type: 'character varying', nullable: true },
        notes: { type: 'text', nullable: true },
        created_at: { type: 'timestamp with time zone', nullable: true },
        updated_at: { type: 'timestamp with time zone', nullable: true }
      },
      indexes: ['idx_clients_company_name'],
      constraints: [] // No FK constraints defined directly on clients in the SQL
    },
    jobs: {
      columns: {
        id: { type: 'uuid', nullable: false },
        name: { type: 'character varying', nullable: false },
        client_id: { type: 'uuid', nullable: false }, // FK to clients
        description: { type: 'text', nullable: true },
        created_at: { type: 'timestamp with time zone', nullable: true },
        updated_at: { type: 'timestamp with time zone', nullable: true }
      },
      indexes: ['idx_jobs_client_id'],
      constraints: ['jobs_client_id_fkey'] // Auto-generated FK constraint name
    },
    shifts: {
      columns: {
        id: { type: 'uuid', nullable: false },
        job_id: { type: 'uuid', nullable: false }, // FK to jobs
        crew_chief_id: { type: 'uuid', nullable: false }, // FK to users
        date: { type: 'date', nullable: false },
        start_time: { type: 'time without time zone', nullable: false },
        end_time: { type: 'time without time zone', nullable: false },
        location: { type: 'character varying', nullable: true },
        requested_workers: { type: 'integer', nullable: true },
        status: { type: 'character varying', nullable: true },
        notes: { type: 'text', nullable: true },
        created_at: { type: 'timestamp with time zone', nullable: true },
        updated_at: { type: 'timestamp with time zone', nullable: true }
      },
      indexes: ['idx_shifts_date', 'idx_shifts_crew_chief'],
      constraints: ['shifts_job_id_fkey', 'shifts_crew_chief_id_fkey']
    },
    worker_requirements: {
      columns: {
        id: { type: 'uuid', nullable: false },
        shift_id: { type: 'uuid', nullable: false }, // FK to shifts
        role_code: { type: 'character varying', nullable: false },
        required_count: { type: 'integer', nullable: false },
        created_at: { type: 'timestamp with time zone', nullable: true },
        updated_at: { type: 'timestamp with time zone', nullable: true }
      },
      indexes: ['idx_worker_requirements_shift'],
      constraints: ['worker_requirements_shift_id_fkey', 'worker_requirements_shift_id_role_code_key'] // FK and UNIQUE constraint
    },
    assigned_personnel: {
      columns: {
        id: { type: 'uuid', nullable: false },
        shift_id: { type: 'uuid', nullable: false }, // FK to shifts
        employee_id: { type: 'uuid', nullable: false }, // FK to users
        role_on_shift: { type: 'character varying', nullable: true },
        role_code: { type: 'character varying', nullable: true },
        status: { type: 'character varying', nullable: true },
        is_placeholder: { type: 'boolean', nullable: true },
        created_at: { type: 'timestamp with time zone', nullable: true },
        updated_at: { type: 'timestamp with time zone', nullable: true }
      },
      indexes: ['idx_assigned_personnel_shift', 'idx_assigned_personnel_employee'],
      constraints: ['assigned_personnel_shift_id_fkey', 'assigned_personnel_employee_id_fkey', 'assigned_personnel_shift_id_employee_id_key'] // FKs and UNIQUE constraint
    },
    time_entries: {
      columns: {
        id: { type: 'uuid', nullable: false },
        assigned_personnel_id: { type: 'uuid', nullable: false }, // FK to assigned_personnel
        entry_number: { type: 'integer', nullable: false },
        clock_in: { type: 'timestamp with time zone', nullable: true },
        clock_out: { type: 'timestamp with time zone', nullable: true },
        is_active: { type: 'boolean', nullable: true },
        created_at: { type: 'timestamp with time zone', nullable: true },
        updated_at: { type: 'timestamp with time zone', nullable: true }
      },
      indexes: ['idx_time_entries_assigned_personnel'],
      constraints: ['time_entries_assigned_personnel_id_fkey', 'time_entries_assigned_personnel_id_entry_number_key'] // FK and UNIQUE constraint
    },
    timesheets: {
      columns: {
        id: { type: 'uuid', nullable: false },
        shift_id: { type: 'uuid', nullable: false }, // FK to shifts
        status: { type: 'character varying', nullable: true },
        submitted_by: { type: 'uuid', nullable: true }, // FK to users
        submitted_at: { type: 'timestamp with time zone', nullable: true },
        client_approved_by: { type: 'uuid', nullable: true }, // FK to users
        client_approved_at: { type: 'timestamp with time zone', nullable: true },
        client_signature: { type: 'text', nullable: true },
        manager_approved_by: { type: 'uuid', nullable: true }, // FK to users
        manager_approved_at: { type: 'timestamp with time zone', nullable: true },
        manager_signature: { type: 'text', nullable: true },
        rejection_reason: { type: 'text', nullable: true },
        pdf_file_path: { type: 'character varying', nullable: true },
        pdf_generated_at: { type: 'timestamp with time zone', nullable: true },
        created_at: { type: 'timestamp with time zone', nullable: true },
        updated_at: { type: 'timestamp with time zone', nullable: true }
      },
      indexes: ['idx_timesheets_shift'],
      constraints: ['timesheets_shift_id_fkey', 'timesheets_submitted_by_fkey', 'timesheets_client_approved_by_fkey', 'timesheets_manager_approved_by_fkey']
    },
    documents: {
      columns: {
        id: { type: 'uuid', nullable: false },
        name: { type: 'character varying', nullable: false },
        type: { type: 'character varying', nullable: false },
        category: { type: 'character varying', nullable: false },
        upload_date: { type: 'date', nullable: false },
        url: { type: 'character varying', nullable: true },
        status: { type: 'character varying', nullable: true },
        assignee_id: { type: 'uuid', nullable: true }, // FK to users
        is_template: { type: 'boolean', nullable: true },
        created_at: { type: 'timestamp with time zone', nullable: true },
        updated_at: { type: 'timestamp with time zone', nullable: true }
      },
      indexes: ['idx_documents_assignee'],
      constraints: ['documents_assignee_id_fkey']
    },
    announcements: {
      columns: {
        id: { type: 'uuid', nullable: false },
        title: { type: 'character varying', nullable: false },
        content: { type: 'text', nullable: false },
        date: { type: 'date', nullable: false },
        created_by: { type: 'uuid', nullable: false }, // FK to users
        created_at: { type: 'timestamp with time zone', nullable: true },
        updated_at: { type: 'timestamp with time zone', nullable: true }
      },
      indexes: ['idx_announcements_date'],
      constraints: ['announcements_created_by_fkey']
    },
    crew_chief_permissions: {
      columns: {
        id: { type: 'uuid', nullable: false },
        user_id: { type: 'uuid', nullable: false }, // FK to users
        permission_type: { type: 'character varying', nullable: false },
        target_id: { type: 'uuid', nullable: false },
        granted_by_user_id: { type: 'uuid', nullable: false }, // FK to users
        granted_at: { type: 'timestamp with time zone', nullable: true },
        revoked_at: { type: 'timestamp with time zone', nullable: true }
      },
      indexes: ['idx_crew_chief_permissions_user_id', 'idx_crew_chief_permissions_target'],
      constraints: ['crew_chief_permissions_user_id_fkey', 'crew_chief_permissions_granted_by_user_id_fkey', 'crew_chief_permissions_user_id_permission_type_target_id_revoked_at_key'] // FKs and UNIQUE constraint
    },
    audit_log: {
      columns: {
        id: { type: 'uuid', nullable: false },
        action: { type: 'character varying', nullable: false },
        entity_type: { type: 'character varying', nullable: false },
        entity_id: { type: 'uuid', nullable: false },
        entity_name: { type: 'character varying', nullable: true },
        performed_by: { type: 'uuid', nullable: false }, // FK to users
        performed_at: { type: 'timestamp with time zone', nullable: true },
        details: { type: 'jsonb', nullable: true },
        ip_address: { type: 'inet', nullable: true },
        user_agent: { type: 'text', nullable: true }
      },
      indexes: ['idx_audit_log_performed_by', 'idx_audit_log_entity'],
      constraints: ['audit_log_performed_by_fkey']
    },
    notifications: {
      columns: {
        id: { type: 'uuid', nullable: false },
        user_id: { type: 'uuid', nullable: false }, // FK to users
        type: { type: 'character varying', nullable: false },
        title: { type: 'character varying', nullable: false },
        message: { type: 'text', nullable: false },
        related_timesheet_id: { type: 'uuid', nullable: true }, // FK to timesheets
        related_shift_id: { type: 'uuid', nullable: true }, // FK to shifts
        is_read: { type: 'boolean', nullable: true },
        created_at: { type: 'timestamp with time zone', nullable: true },
        updated_at: { type: 'timestamp with time zone', nullable: true }
      },
      indexes: ['idx_notifications_user_id', 'idx_notifications_unread'], // Note: idx_notifications_unread is a partial index, handled differently
      constraints: ['notifications_user_id_fkey', 'notifications_related_timesheet_id_fkey', 'notifications_related_shift_id_fkey']
    }
  }
};

// --- Helper Functions ---

/**
 * Normalizes PostgreSQL data type names for easier comparison.
 * e.g., 'character varying(255)' becomes 'character varying'
 * @param {string} type
 * @returns {string}
 */
function normalizeDataType(type) {
  if (!type) return '';
  // Remove length specifiers like (255)
  return type.replace(/\(\d+\)$/, '').toLowerCase();
}

/**
 * Validates a single column against its expected definition.
 * @param {string} tableName
 * @param {string} columnName
 * @param {object} columnDef - Expected column definition { type: string, nullable: boolean }
 * @returns {Promise<boolean>} True if valid, false otherwise.
 */
async function validateColumn(tableName, columnName, columnDef) {
  const query = `
    SELECT data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = $1
      AND column_name = $2;
  `;
  const res = await client.query(query, [tableName, columnName]);

  if (res.rows.length === 0) {
    console.error(`❌ [FAIL] Table '${tableName}': Column '${columnName}' not found.`);
    return false;
  }

  const actual = res.rows[0];
  const normalizedActualType = normalizeDataType(actual.data_type);
  const normalizedExpectedType = normalizeDataType(columnDef.type);

  let typeMatch = normalizedActualType === normalizedExpectedType;

  // Special handling for arrays where information_schema returns 'ARRAY'
  if (columnDef.type.endsWith('[]')) {
    if (normalizedActualType !== 'array') {
      console.error(`❌ [FAIL] Table '${tableName}', Column '${columnName}': Type mismatch for array. Expected array type, found '${normalizedActualType}'.`);
      typeMatch = false;
    } else {
      // For arrays, we might want to check the element type if possible, but information_schema is limited.
      // For now, just confirming it's an array type is sufficient for basic validation.
      typeMatch = true; // It's an array, consider it a type match for now.
    }
  }

  if (!typeMatch) {
    console.error(`❌ [FAIL] Table '${tableName}', Column '${columnName}': Type mismatch. Expected '${columnDef.type}' (normalized: '${normalizedExpectedType}'), found '${actual.data_type}' (normalized: '${normalizedActualType}').`);
    return false;
  }

  const nullableMatch = (actual.is_nullable === 'YES') === columnDef.nullable;
  if (!nullableMatch) {
    console.error(`❌ [FAIL] Table '${tableName}', Column '${columnName}': Nullability mismatch. Expected nullable=${columnDef.nullable}, found nullable=${actual.is_nullable === 'YES'}.`);
    return false;
  }

  // Optional: Validate default values (can be complex due to functions like NOW(), uuid_generate_v4())
  // This part is tricky and often best left to manual review or more advanced schema comparison tools.
  // For example, checking `DEFAULT uuid_generate_v4()` vs `DEFAULT generate_uuid_v4()` might fail.
  // We'll skip rigorous default value validation for simplicity here.
  /*
  if (columnDef.default !== undefined && columnDef.default !== null) {
    // Compare columnDef.default with actual.column_default
    // This requires careful string matching, considering whitespace, function calls, etc.
  }
  */

  console.log(`✅ [PASS] Table '${tableName}', Column '${columnName}' is valid.`);
  return true;
}

/**
 * Validates a table's existence, columns, indexes, and constraints.
 * @param {string} tableName
 * @param {object} tableDef - Expected table definition { columns: {}, indexes: [], constraints: [] }
 * @returns {Promise<boolean>} True if the table and its components are valid, false otherwise.
 */
async function validateTable(tableName, tableDef) {
  let allComponentsValid = true;
  console.log(`\n--- Validating Table: ${tableName} ---`);

  // 1. Check Table Existence
  const tableExistsRes = await client.query(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = $1
    );
  `, [tableName]);

  const tableExists = tableExistsRes.rows[0].exists;
  if (!tableExists) {
    console.error(`❌ [FAIL] Table '${tableName}' does not exist.`);
    return false;
  }
  console.log(`✅ [PASS] Table '${tableName}' exists.`);

  // 2. Validate Columns
  for (const columnName in tableDef.columns) {
    const isValid = await validateColumn(tableName, columnName, tableDef.columns[columnName]);
    if (!isValid) allComponentsValid = false;
  }

  // 3. Validate Indexes
  const indexQuery = `
    SELECT indexname FROM pg_indexes
    WHERE tablename = $1 AND schemaname = 'public';
  `;
  const indexRes = await client.query(indexQuery, [tableName]);
  const actualIndexes = new Set(indexRes.rows.map(row => row.indexname));

  for (const expectedIndexName of tableDef.indexes) {
    if (!actualIndexes.has(expectedIndexName)) {
      console.error(`❌ [FAIL] Table '${tableName}': Index '${expectedIndexName}' not found.`);
      allComponentsValid = false;
    } else {
      console.log(`✅ [PASS] Table '${tableName}', Index '${expectedIndexName}' found.`);
      // Remove from set to check for extra indexes later if needed
      actualIndexes.delete(expectedIndexName);
    }
  }

  // Optional: Check for unexpected indexes (can be noisy if schema changes often)
  // for (const unexpectedIndexName of actualIndexes) {
  //   console.warn(`⚠️ [WARN] Table '${tableName}': Unexpected index '${unexpectedIndexName}' found.`);
  // }


  // 4. Validate Constraints
  const constraintQuery = `
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = (
      SELECT oid FROM pg_class WHERE relname = $1 AND relnamespace = (
        SELECT oid FROM pg_namespace WHERE nspname = 'public'
      )
    )
    AND contype IN ('f', 'u', 'p', 'c'); -- f=foreign key, u=unique, p=primary key, c=check
  `;
  const constraintRes = await client.query(constraintQuery, [tableName]);
  const actualConstraints = new Set(constraintRes.rows.map(row => row.conname));

  for (const expectedConstraintName of tableDef.constraints) {
    if (!actualConstraints.has(expectedConstraintName)) {
      console.error(`❌ [FAIL] Table '${tableName}': Constraint '${expectedConstraintName}' not found.`);
      allComponentsValid = false;
    } else {
      console.log(`✅ [PASS] Table '${tableName}', Constraint '${expectedConstraintName}' found.`);
      actualConstraints.delete(expectedConstraintName);
    }
  }

  // Optional: Check for unexpected constraints
  // for (const unexpectedConstraintName of actualConstraints) {
  //   console.warn(`⚠️ [WARN] Table '${tableName}': Unexpected constraint '${unexpectedConstraintName}' found.`);
  // }

  return allComponentsValid;
}

// --- Main Validation Logic ---
async function main() {
  let allValid = true;
  try {
    await client.connect();
    console.log('🚀 Connected to database. Starting schema validation...');
    if (!isProduction) {
      console.warn('⚠️ WARNING: Running with SSL validation disabled (rejectUnauthorized: false). This is insecure and should ONLY be used for local development.');
    }

    // Iterate through all tables defined in expectedSchema
    for (const tableName in expectedSchema.tables) {
      if (Object.hasOwnProperty.call(expectedSchema.tables, tableName)) {
        const tableDef = expectedSchema.tables[tableName];
        const tableIsValid = await validateTable(tableName, tableDef);
        if (!tableIsValid) {
          allValid = false;
        }
      }
    }

    // Optional: Check for tables in the database that are NOT defined in expectedSchema
    const allDbTablesRes = await client.query(`
      SELECT tablename
      FROM pg_catalog.pg_tables
      WHERE schemaname = 'public';
    `);
    const existingDbTables = new Set(allDbTablesRes.rows.map(row => row.tablename));
    const expectedDbTables = new Set(Object.keys(expectedSchema.tables));

    for (const dbTable of existingDbTables) {
      if (!expectedDbTables.has(dbTable)) {
        console.warn(`⚠️ [WARN] Table '${dbTable}' exists in the database but is not defined in the expected schema.`);
      }
    }

  } catch (err) {
    console.error('🚨 Validation script failed with an error:', err.message);
    // Log the full error if it's not just a connection error
    if (err.code !== '3D000' && err.code !== '28000' && err.code !== '3F000') { // Common connection/auth error codes
        console.error(err);
    }
    process.exit(1);
  } finally {
    await client.end();
    if (allValid) {
      console.log('\n🎉 Schema validation completed successfully. All checks passed!');
      process.exit(0);
    } else {
      console.error('\n❌ Schema validation failed. Please review the errors above.');
      process.exit(1);
    }
  }
}

main();
