import { Pool, PoolClient, QueryResult } from 'pg';

let pool: Pool | null = null;
let poolStats = {
  totalQueries: 0,
  successfulQueries: 0,
  failedQueries: 0,
  averageQueryTime: 0,
  connectionErrors: 0,
  lastError: null as string | null,
  lastErrorTime: null as Date | null
};

interface QueryOptions {
  timeout?: number;
  retries?: number;
  useReadReplica?: boolean;
  priority?: 'low' | 'normal' | 'high';
}

interface QueryMetrics {
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  error?: string;
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

    // Optimized pool configuration for better stability and resource management
    pool = new Pool({
      connectionString,
      ssl: sslConfig,
      max: process.env.NODE_ENV === 'production' ? 8 : 5, // Reduced for better resource management
      min: 0, // No minimum connections to allow pool to scale down
      idleTimeoutMillis: 15000, // 15 seconds idle timeout (reduced for faster cleanup)
      connectionTimeoutMillis: 8000, // 8 seconds connection timeout
      statement_timeout: 30000, // 30 second query timeout
      query_timeout: 30000,
      // Enhanced stability settings
      keepAlive: true,
      keepAliveInitialDelayMillis: 3000, // Reduced initial delay
      allowExitOnIdle: true, // Allow pool to exit when idle
      // Application identification
      application_name: 'holitime-app'
    });

    // Enhanced error handling with metrics
    pool.on('error', (err: Error) => {
      console.error('Unexpected error on idle user session', err);
      poolStats.connectionErrors++;
      poolStats.lastError = err.message;
      poolStats.lastErrorTime = new Date();
    });

    pool.on('connect', () => {
      console.log('New user connected to database');
    });

    pool.on('remove', (_client: PoolClient) => {
      console.log('User removed from pool');
    });
  }
  return pool;
}

// Enhanced query function with metrics and caching
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

  const metrics: QueryMetrics = {
    startTime: Date.now(),
    success: false
  };

  poolStats.totalQueries++;

  const pool = getPool();
  let client: PoolClient | null = null;
  const maxRetries = options.retries || 2;
  let lastError: Error | null = null;

  // Retry logic for connection failures
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      client = await pool.connect();
      break; // Success, exit retry loop
    } catch (error: any) {
      lastError = error;

      // Check if this is a connection-related error that we should retry
      const isRetryableError = error.code === '53300' || // too many connections
                              error.code === 'ECONNREFUSED' ||
                              error.code === 'ENOTFOUND' ||
                              error.code === 'ETIMEDOUT' ||
                              error.message?.includes('timeout') ||
                              error.message?.includes('connection');

      if (!isRetryableError || attempt === maxRetries) {
        throw error; // Not retryable or max retries reached
      }

      // Wait before retrying (exponential backoff)
      const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
      console.warn(`Database connection attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  if (!client) {
    throw lastError || new Error('Failed to acquire database connection');
  }

  try {
    
    // Set statement timeout if specified
    if (options.timeout) {
      await client.query(`SET statement_timeout = ${options.timeout}`);
    }

    // Set query priority if specified
    if (options.priority === 'low') {
      await client.query('SET statement_timeout = 120000'); // 2 minutes for low priority
    } else if (options.priority === 'high') {
      await client.query('SET statement_timeout = 30000'); // 30 seconds for high priority
    }

    const result = await client.query(text, params);
    
    metrics.endTime = Date.now();
    metrics.duration = metrics.endTime - metrics.startTime;
    metrics.success = true;
    
    // Update stats
    poolStats.successfulQueries++;
    updateAverageQueryTime(metrics.duration);
    
    // Log slow queries in production
    if (process.env.NODE_ENV === 'production' && metrics.duration > 5000) {
      console.warn('Slow query detected:', {
        query: text.substring(0, 200) + '...',
        duration: metrics.duration,
        params: params ? params.length : 0
      });
    }

    return result;
  } catch (error) {
    metrics.endTime = Date.now();
    metrics.duration = metrics.endTime - metrics.startTime;
    metrics.error = error instanceof Error ? error.message : 'Unknown error';
    
    poolStats.failedQueries++;
    poolStats.lastError = metrics.error;
    poolStats.lastErrorTime = new Date();
    
    console.error('Database query error:', {
      query: text.substring(0, 100) + '...',
      error: metrics.error,
      duration: metrics.duration,
      params: params ? params.length : 0,
      poolStats: getPoolStats()
    });
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
}

// Helper function to update average query time
function updateAverageQueryTime(duration: number): void {
  const totalQueries = poolStats.successfulQueries;
  if (totalQueries === 1) {
    poolStats.averageQueryTime = duration;
  } else {
    poolStats.averageQueryTime = (poolStats.averageQueryTime * (totalQueries - 1) + duration) / totalQueries;
  }
}

// Cached query function for read-heavy operations
export async function cachedQuery(
  text: string,
  params?: any[],
  cacheKey?: string,
  cacheTime: number = 5 * 60 * 1000, // 5 minutes default
  options: QueryOptions = {}
): Promise<QueryResult> {
  // Import cache here to avoid circular dependency
  const { globalCache } = await import('./cache');
  
  if (cacheKey) {
    const cached = globalCache.get<QueryResult>(cacheKey);
    if (cached && !cached.isStale) {
      return cached.data;
    }
  }

  const result = await query(text, params, options);
  
  if (cacheKey) {
    const { globalCache } = await import('./cache');
    globalCache.set(cacheKey, result, cacheTime, ['database']);
  }

  return result;
}

// Batch query function for multiple operations
export async function batchQuery(
  queries: Array<{ text: string; params?: any[]; options?: QueryOptions }>,
  useTransaction: boolean = false
): Promise<QueryResult[]> {
  if (useTransaction) {
    return withTransaction(async (client) => {
      const results: QueryResult[] = [];
      for (const { text, params, options = {} } of queries) {
        // Set timeout if specified
        if (options.timeout) {
          await client.query(`SET statement_timeout = ${options.timeout}`);
        }
        const result = await client.query(text, params);
        results.push(result);
      }
      return results;
    });
  } else {
    const promises = queries.map(({ text, params, options }) => 
      query(text, params, options)
    );
    return Promise.all(promises);
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


// Enhanced pool statistics for monitoring
export function getPoolStats() {
  if (!pool) {
    return null;
  }

  return {
    // Pool connection stats
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
    
    // Query performance stats
    totalQueries: poolStats.totalQueries,
    successfulQueries: poolStats.successfulQueries,
    failedQueries: poolStats.failedQueries,
    successRate: poolStats.totalQueries > 0 ? 
      (poolStats.successfulQueries / poolStats.totalQueries * 100).toFixed(2) + '%' : '0%',
    averageQueryTime: Math.round(poolStats.averageQueryTime),
    
    // Error tracking
    connectionErrors: poolStats.connectionErrors,
    lastError: poolStats.lastError,
    lastErrorTime: poolStats.lastErrorTime,
    
    // Health indicators
    isHealthy: poolStats.connectionErrors < 5 && 
               (poolStats.totalQueries === 0 || poolStats.successfulQueries / poolStats.totalQueries > 0.95),
    uptime: pool ? Date.now() - (poolStats.lastErrorTime?.getTime() || Date.now()) : 0
  };
}

// Reset pool if it's in a bad state
export async function resetPoolIfNeeded() {
  if (pool) {
    const stats = getPoolStats();

    // Reset if too many connection errors or if pool is unhealthy
    if (stats && (stats.connectionErrors > 10 || (!stats.isHealthy && stats.totalQueries > 20))) {
      console.warn('Resetting database pool due to poor health:', stats);

      try {
        await pool.end();
      } catch (error) {
        console.error('Error ending pool:', error);
      }

      pool = null;

      // Reset stats
      poolStats = {
        totalQueries: 0,
        successfulQueries: 0,
        failedQueries: 0,
        averageQueryTime: 0,
        connectionErrors: 0,
        lastError: null,
        lastErrorTime: null
      };

      console.log('Database pool reset successfully');
    }
  }
}

// Enhanced health check with detailed diagnostics
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  details: {
    connectionTest: boolean;
    queryTest: boolean;
    poolStatus: any;
    responseTime: number;
    error?: string;
  };
}> {
  const startTime = Date.now();
  const details = {
    connectionTest: false,
    queryTest: false,
    poolStatus: getPoolStats(),
    responseTime: 0,
    error: undefined as string | undefined
  };

  try {
    // Test basic connection
    const pool = getPool();
    const client = await pool.connect();
    details.connectionTest = true;
    
    try {
      // Test query execution
      const result = await client.query('SELECT 1 as health_check, NOW() as server_time');
      details.queryTest = result.rows.length > 0 && result.rows[0].health_check === 1;
      client.release();
    } catch (queryError) {
      client.release();
      details.error = `Query test failed: ${queryError instanceof Error ? queryError.message : 'Unknown error'}`;
    }
  } catch (connectionError) {
    details.error = `Connection test failed: ${connectionError instanceof Error ? connectionError.message : 'Unknown error'}`;
  }

  details.responseTime = Date.now() - startTime;
  
  return {
    healthy: details.connectionTest && details.queryTest,
    details
  };
}

// Database performance monitoring
export async function getDatabaseMetrics(): Promise<{
  performance: {
    activeConnections: number;
    totalQueries: number;
    averageQueryTime: number;
    slowQueries: number;
    errorRate: number;
  };
  health: {
    isHealthy: boolean;
    uptime: number;
    lastError?: string;
    lastErrorTime?: Date;
  };
  recommendations: string[];
}> {
  const stats = getPoolStats();
  const health = await checkDatabaseHealth();
  
  const recommendations: string[] = [];
  
  if (stats) {
    // Performance recommendations
    if (stats.averageQueryTime > 1000) {
      recommendations.push('Consider optimizing slow queries or adding database indexes');
    }
    
    if (stats.waitingCount > 0) {
      recommendations.push('Consider increasing database connection pool size');
    }
    
    if (stats.connectionErrors > 3) {
      recommendations.push('Investigate connection stability issues');
    }
    
    const errorRate = stats.totalQueries > 0 ? 
      (stats.failedQueries / stats.totalQueries) * 100 : 0;
    
    if (errorRate > 5) {
      recommendations.push('High error rate detected - review query patterns and error logs');
    }
  }

  return {
    performance: {
      activeConnections: stats?.totalCount || 0,
      totalQueries: stats?.totalQueries || 0,
      averageQueryTime: stats?.averageQueryTime || 0,
      slowQueries: 0, // Could be enhanced to track slow queries
      errorRate: stats ? (stats.failedQueries / Math.max(stats.totalQueries, 1)) * 100 : 0
    },
    health: {
      isHealthy: health.healthy,
      uptime: stats?.uptime || 0,
      lastError: stats?.lastError || undefined,
      lastErrorTime: stats?.lastErrorTime || undefined
    },
    recommendations
  };
}

// Reset statistics (useful for testing or monitoring resets)
export function resetPoolStats(): void {
  poolStats = {
    totalQueries: 0,
    successfulQueries: 0,
    failedQueries: 0,
    averageQueryTime: 0,
    connectionErrors: 0,
    lastError: null,
    lastErrorTime: null
  };
}

// Graceful shutdown function for Cloud Run
export async function gracefulShutdown(): Promise<void> {
  console.log('Starting graceful database shutdown...');
  
  if (pool) {
    try {
      // Wait for active queries to complete (with timeout)
      const shutdownTimeout = 30000; // 30 seconds
      const startTime = Date.now();
      
      while (pool.totalCount > pool.idleCount && Date.now() - startTime < shutdownTimeout) {
        console.log(`Waiting for ${pool.totalCount - pool.idleCount} active connections to finish...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      await pool.end();
      pool = null;
      console.log('Database pool closed successfully');
    } catch (error) {
      console.error('Error during database shutdown:', error);
    }
  }
}

// Handle Cloud Run shutdown signals
if (typeof process !== 'undefined') {
  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
}


