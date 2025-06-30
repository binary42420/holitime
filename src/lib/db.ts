import { Pool, PoolClient, QueryResult } from 'pg';

let pool: Pool | null = null;

interface QueryOptions {
  timeout?: number;
  retries?: number;
}

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    // SSL configuration for Aiven and other cloud databases
    let sslConfig: any = false;

    if (connectionString.includes('sslmode=require')) {
      // For Aiven and other cloud providers that use self-signed certificates
      if (connectionString.includes('aivencloud.com') || process.env.DATABASE_PROVIDER === 'aiven') {
        sslConfig = {
          rejectUnauthorized: false, // Allow self-signed certificates for Aiven
        };
      } else {
        sslConfig = {
          rejectUnauthorized: process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0',
          ca: process.env.DATABASE_CA_CERT, // Use proper CA certificate if available
        };
      }
    }

    pool = new Pool({
      connectionString,
      ssl: sslConfig,
      max: 5, // Reduced from 20 to 5 to avoid "too many connections" error
      min: 1, // Keep at least 1 connection alive
      idleTimeoutMillis: 10000, // Reduced from 30s to 10s to release connections faster
      connectionTimeoutMillis: 5000,
      statement_timeout: 30000, // 30 second query timeout
      query_timeout: 30000
    });

    // Handle pool errors
    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
  }
  return pool;
}

// Secure query function with parameter validation
export async function query(
  text: string, 
  params?: any[], 
  options: QueryOptions = {}
): Promise<QueryResult> {
  if (!text || typeof text !== 'string') {
    throw new Error('Query text must be a non-empty string');
  }

  // Validate parameters to prevent injection
  if (params) {
    for (const param of params) {
      if (param !== null && param !== undefined && typeof param === 'object' && !Array.isArray(param) && !(param instanceof Date)) {
        throw new Error('Invalid parameter type - objects not allowed');
      }
    }
  }

  const pool = getPool();
  const client = await pool.connect();
  
  try {
    // Set statement timeout if specified
    if (options.timeout) {
      await client.query(`SET statement_timeout = ${options.timeout}`);
    }

    const result = await client.query(text, params);
    return result;
  } catch (error) {
    console.error('Database query error:', {
      query: text.substring(0, 100) + '...', // Log first 100 chars only
      error: error instanceof Error ? error.message : 'Unknown error',
      params: params ? params.length : 0
    });
    throw error;
  } finally {
    client.release();
  }
}

// Transaction wrapper for atomic operations
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Transaction rolled back:', error);
    throw error;
  } finally {
    client.release();
  }
}

export async function getClient(): Promise<PoolClient> {
  const pool = getPool();
  return await pool.connect();
}

// Helper function to close the pool (useful for testing or graceful shutdown)
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

// Health check function to test database connectivity
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const result = await query('SELECT 1 as health_check');
    return result.rows.length > 0 && result.rows[0].health_check === 1;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

// Get pool statistics for monitoring
export function getPoolStats() {
  if (!pool) {
    return null;
  }

  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  };
}


