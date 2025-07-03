const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function resetDatabasePool() {
  console.log('🔄 Resetting database connection pool...');
  
  try {
    // Create a new pool to test connection
    const testPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 1, // Just one connection for testing
      ssl: process.env.DATABASE_URL.includes('sslmode=require') ? {
        rejectUnauthorized: false
      } : false
    });

    // Test basic connection
    console.log('📋 Testing database connection...');
    const client = await testPool.connect();
    
    // Test basic query
    const result = await client.query('SELECT NOW() as current_time, version() as db_version');
    console.log('✅ Database connection successful!');
    console.log('   Current time:', result.rows[0].current_time);
    console.log('   Database version:', result.rows[0].db_version.split(' ')[0]);
    
    // Check current connections
    const connectionResult = await client.query(`
      SELECT 
        count(*) as total_connections,
        count(*) FILTER (WHERE state = 'active') as active_connections,
        count(*) FILTER (WHERE state = 'idle') as idle_connections
      FROM pg_stat_activity 
      WHERE datname = current_database()
    `);
    
    console.log('📊 Current database connections:');
    console.log('   Total:', connectionResult.rows[0].total_connections);
    console.log('   Active:', connectionResult.rows[0].active_connections);
    console.log('   Idle:', connectionResult.rows[0].idle_connections);
    
    // Check for long-running queries
    const longRunningResult = await client.query(`
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
    
    if (longRunningResult.rows.length > 0) {
      console.log('⚠️  Long-running queries detected:');
      longRunningResult.rows.forEach(row => {
        console.log(`   PID ${row.pid}: ${row.duration} - ${row.query.substring(0, 100)}...`);
      });
    } else {
      console.log('✅ No long-running queries detected');
    }
    
    // Test time_entries table specifically (since that's where the error occurred)
    console.log('📋 Testing time_entries table...');
    const timeEntriesResult = await client.query(`
      SELECT COUNT(*) as count FROM time_entries LIMIT 1
    `);
    console.log('✅ time_entries table accessible, count:', timeEntriesResult.rows[0].count);
    
    // Test assigned_personnel table
    console.log('📋 Testing assigned_personnel table...');
    const assignedResult = await client.query(`
      SELECT COUNT(*) as count FROM assigned_personnel LIMIT 1
    `);
    console.log('✅ assigned_personnel table accessible, count:', assignedResult.rows[0].count);
    
    client.release();
    await testPool.end();
    
    console.log('🎉 Database pool reset and testing completed successfully!');
    console.log('');
    console.log('💡 Recommendations:');
    console.log('   - Restart the Next.js development server');
    console.log('   - Monitor connection usage in the application');
    console.log('   - Check for connection leaks in API endpoints');
    
  } catch (error) {
    console.error('❌ Error testing database connection:', error);
    
    if (error.message.includes('remaining connection slots')) {
      console.log('');
      console.log('🔧 Connection pool exhaustion detected. Possible solutions:');
      console.log('   1. Restart the PostgreSQL service');
      console.log('   2. Kill idle connections manually');
      console.log('   3. Increase max_connections in PostgreSQL config');
      console.log('   4. Reduce connection pool size in application');
    }
  }
}

resetDatabasePool();
