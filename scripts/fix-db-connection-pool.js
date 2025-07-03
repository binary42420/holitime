require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function fixDatabaseConnectionPool() {
  console.log('🔧 Fixing Database Connection Pool Issues...\n');

  try {
    // First, check current connection status
    console.log('📋 Checking current database status...');
    
    const diagnosticPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 1,
      idleTimeoutMillis: 5000,
      connectionTimeoutMillis: 5000,
    });

    const client = await diagnosticPool.connect();
    
    // Check active connections
    const connectionsResult = await client.query(`
      SELECT 
        count(*) as total_connections,
        count(*) FILTER (WHERE state = 'active') as active_connections,
        count(*) FILTER (WHERE state = 'idle') as idle_connections,
        count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction
      FROM pg_stat_activity 
      WHERE datname = current_database()
    `);
    
    const connStats = connectionsResult.rows[0];
    console.log('📊 Current connection status:');
    console.log(`  Total connections: ${connStats.total_connections}`);
    console.log(`  Active connections: ${connStats.active_connections}`);
    console.log(`  Idle connections: ${connStats.idle_connections}`);
    console.log(`  Idle in transaction: ${connStats.idle_in_transaction}`);

    // Check for long-running queries
    const longQueriesResult = await client.query(`
      SELECT 
        pid,
        now() - pg_stat_activity.query_start AS duration,
        query,
        state
      FROM pg_stat_activity 
      WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes'
        AND datname = current_database()
        AND state != 'idle'
    `);

    if (longQueriesResult.rows.length > 0) {
      console.log('⚠️  Long-running queries detected:');
      longQueriesResult.rows.forEach(row => {
        console.log(`  PID ${row.pid}: ${row.duration} - ${row.query.substring(0, 100)}...`);
      });
    } else {
      console.log('✅ No long-running queries detected');
    }

    // Check database limits
    const limitsResult = await client.query(`
      SELECT 
        setting as max_connections
      FROM pg_settings 
      WHERE name = 'max_connections'
    `);
    
    console.log(`📊 Database connection limit: ${limitsResult.rows[0].max_connections}`);

    client.release();
    await diagnosticPool.end();

    // Test optimized connection configuration
    console.log('\n🔧 Testing optimized connection configuration...');
    
    const optimizedPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      // Reduced connection pool size for better resource management
      max: 5, // Reduced from 10-15
      min: 0, // No minimum connections
      idleTimeoutMillis: 10000, // 10 seconds (reduced from 30)
      connectionTimeoutMillis: 8000, // 8 seconds
      acquireTimeoutMillis: 8000, // 8 seconds to acquire connection
      // Additional stability settings
      keepAlive: true,
      keepAliveInitialDelayMillis: 3000,
      allowExitOnIdle: true,
    });

    // Test the optimized pool with multiple concurrent connections
    console.log('📋 Testing concurrent connections...');
    const testPromises = [];
    
    for (let i = 0; i < 3; i++) {
      testPromises.push(
        (async () => {
          try {
            const testClient = await optimizedPool.connect();
            const result = await testClient.query('SELECT $1 as test_id, NOW() as test_time', [i]);
            console.log(`✅ Test ${i}: ${result.rows[0].test_time}`);
            testClient.release();
            return true;
          } catch (error) {
            console.error(`❌ Test ${i} failed:`, error.message);
            return false;
          }
        })()
      );
    }

    const results = await Promise.all(testPromises);
    const successCount = results.filter(r => r).length;
    console.log(`📊 Concurrent test results: ${successCount}/3 successful`);

    await optimizedPool.end();

    // Test the specific failing query
    console.log('\n📋 Testing specific API query...');
    
    const apiTestPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 3,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 8000,
    });

    try {
      const apiClient = await apiTestPool.connect();
      
      // Test the clients API query that was failing
      const clientsResult = await apiClient.query(`
        SELECT 
          c.id, c.company_name, c.company_address, c.contact_phone, 
          c.contact_email, c.notes, c.created_at, c.updated_at, c.logo_url
        FROM clients c
        ORDER BY c.company_name ASC
        LIMIT 5
      `);
      
      console.log('✅ Clients API query successful');
      console.log(`📊 Retrieved ${clientsResult.rows.length} clients`);
      
      apiClient.release();
    } catch (error) {
      console.error('❌ API query test failed:', error.code, error.message);
    }

    await apiTestPool.end();

    // Provide recommendations
    console.log('\n📋 Recommendations:');
    
    if (parseInt(connStats.total_connections) > 15) {
      console.log('⚠️  High connection count detected - consider reducing pool size');
    }
    
    if (parseInt(connStats.idle_in_transaction) > 0) {
      console.log('⚠️  Idle transactions detected - check for uncommitted transactions');
    }
    
    console.log('✅ Connection pool optimization suggestions:');
    console.log('  1. Reduce max pool size to 5-8 connections');
    console.log('  2. Decrease idle timeout to 10 seconds');
    console.log('  3. Add connection retry logic in application');
    console.log('  4. Monitor connection usage patterns');
    console.log('  5. Consider connection pooling at application level');

    console.log('\n🚀 Next steps:');
    console.log('  1. Restart your development server');
    console.log('  2. Monitor application logs for connection errors');
    console.log('  3. Test API endpoints after restart');
    console.log('  4. Consider implementing the optimized pool configuration');

  } catch (error) {
    console.error('❌ Connection pool diagnosis failed:', error);
    console.error('Error details:', {
      code: error.code,
      severity: error.severity,
      message: error.message,
      detail: error.detail
    });
    
    console.log('\n🔧 Emergency connection test...');
    try {
      // Try a very basic connection
      const emergencyPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        max: 1,
        idleTimeoutMillis: 5000,
        connectionTimeoutMillis: 3000,
      });
      
      const emergencyClient = await emergencyPool.connect();
      await emergencyClient.query('SELECT 1');
      console.log('✅ Emergency connection successful - database is accessible');
      emergencyClient.release();
      await emergencyPool.end();
    } catch (emergencyError) {
      console.error('❌ Emergency connection failed - database may be unavailable');
      console.error('Emergency error:', emergencyError.message);
    }
  }
}

fixDatabaseConnectionPool();
