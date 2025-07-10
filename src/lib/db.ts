import { Pool, PoolClient, QueryResult } from 'pg';

// This is a simplified and more robust database connection manager.
// It uses a singleton pattern to ensure only one pool is created and reused.

class Database {
  private static instance: Database;
  private pool: Pool;

  private constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set. Please check your .env file.');
    }

    // In production, we must use SSL and the connection string should enforce it.
    if (process.env.NODE_ENV === 'production' && !connectionString.includes('sslmode=require')) {
      console.warn(
        '⚠️ WARNING: In production, DATABASE_URL should include "sslmode=require". Automatically enabling SSL with rejectUnauthorized=true.'
      );
    }
    
    this.pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' 
        ? { rejectUnauthorized: true } 
        : { rejectUnauthorized: false }, // Lenient for local development
      max: process.env.NODE_ENV === 'production' ? 15 : 5, // Fewer connections for local dev
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      application_name: 'holitime-app',
    });

    this.pool.on('error', (err: Error, client: PoolClient) => {
      console.error('Unexpected error on idle client', err);
      // Optional: Add more robust error handling or metrics here
    });
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public async query(text: string, params?: any[]): Promise<QueryResult> {
    const start = Date.now();
    const client = await this.pool.connect();
    try {
      const res = await client.query(text, params);
      const duration = Date.now() - start;
      // Log slow queries
      if (duration > 2000) { // 2 seconds
        console.warn(`[DB] Slow query detected (${duration}ms): ${text.substring(0, 100)}...`);
      }
      return res;
    } catch (err) {
      console.error(`[DB] Error executing query: ${text.substring(0, 100)}...`, err);
      throw err;
    } finally {
      client.release();
    }
  }

  public async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  public async close(): Promise<void> {
    await this.pool.end();
  }

  public getPool(): Pool {
    return this.pool;
  }
}

const db = Database.getInstance();

// Main query function to be used throughout the application
export const query = db.query.bind(db);

// Function to get a client for transactions
export const getClient = db.getClient.bind(db);

// Export the pool for specific use cases, like the health check
export const getPool = db.getPool.bind(db);

export async function checkDatabaseHealth() {
  const client = await getClient();
  try {
    await client.query('SELECT 1');
    return { isHealthy: true };
  } catch (error) {
    console.error('Database health check failed:', error);
    return { isHealthy: false, error };
  } finally {
    client.release();
  }
}

// Transaction wrapper
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Transaction rolled back due to an error.', error);
    throw error;
  } finally {
    client.release();
  }
}
