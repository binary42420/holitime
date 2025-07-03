require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function diagnoseDatabaseConnection() {
  console.log('🔍 Diagnosing Database Connection Issues...\n');

  try {
    // Check environment variables
    console.log('📋 Environment Configuration:');
    console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? 'Set' : 'Missing'}`);
    console.log(`DATABASE_PROVIDER: ${process.env.DATABASE_PROVIDER || 'Not set'}`);
    console.log(`DATABASE_SSL: ${process.env.DATABASE_SSL || 'Not set'}`);
    console.log(`NODE_TLS_REJECT_UNAUTHORIZED: ${process.env.NODE_TLS_REJECT_UNAUTHORIZED || 'Not set'}`);

    // Parse DATABASE_URL to check components
    if (process.env.DATABASE_URL) {
      try {
        const url = new URL(process.env.DATABASE_URL);
        console.log('\n📋 Database URL Components:');
        console.log(`Host: ${url.hostname}`);
        console.log(`Port: ${url.port}`);
        console.log(`Database: ${url.pathname.substring(1)}`);
        console.log(`Username: ${url.username}`);
        console.log(`SSL Mode: ${url.searchParams.get('sslmode') || 'Not specified'}`);
      } catch (error) {
        console.error('❌ Invalid DATABASE_URL format:', error.message);
      }
    }

    // Test different connection configurations
    console.log('\n🧪 Testing Connection Configurations...\n');

    // Configuration 1: Basic connection with minimal settings
    console.log('📋 Test 1: Basic connection...');
    try {
      const basicPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        max: 1, // Minimal connections
        idleTimeoutMillis: 10000,
        connectionTimeoutMillis: 5000,
      });

      const client = await basicPool.connect();
      const result = await client.query('SELECT NOW() as current_time');
      console.log('✅ Basic connection successful');
      console.log(`   Current time: ${result.rows[0].current_time}`);
      client.release();
      await basicPool.end();
    } catch (error) {
      console.error('❌ Basic connection failed:', error.code, error.message);
    }

    // Configuration 2: Connection with retry logic
    console.log('\n📋 Test 2: Connection with retry...');
    try {
      const retryPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        max: 2,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
        acquireTimeoutMillis: 10000,
      });

      // Test with retry logic
      let retries = 3;
      let connected = false;
      
      while (retries > 0 && !connected) {
        try {
          const client = await retryPool.connect();
          await client.query('SELECT 1');
          console.log('✅ Retry connection successful');
          client.release();
          connected = true;
        } catch (error) {
          retries--;
          console.log(`⚠️  Retry attempt failed, ${retries} attempts remaining`);
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }
      
      await retryPool.end();
      
      if (!connected) {
        console.error('❌ All retry attempts failed');
      }
    } catch (error) {
      console.error('❌ Retry connection setup failed:', error.message);
    }

    // Configuration 3: Check database status
    console.log('\n📋 Test 3: Database status check...');
    try {
      const statusPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        max: 1,
        idleTimeoutMillis: 5000,
        connectionTimeoutMillis: 3000,
      });

      const client = await statusPool.connect();
      
      // Check database version
      const versionResult = await client.query('SELECT version()');
      console.log('✅ Database version check successful');
      console.log(`   Version: ${versionResult.rows[0].version.substring(0, 50)}...`);
      
      // Check connection count
      const connectionsResult = await client.query(`
        SELECT count(*) as active_connections 
        FROM pg_stat_activity 
        WHERE state = 'active'
      `);
      console.log(`   Active connections: ${connectionsResult.rows[0].active_connections}`);
      
      // Check database size
      const sizeResult = await client.query(`
        SELECT pg_size_pretty(pg_database_size(current_database())) as db_size
      `);
      console.log(`   Database size: ${sizeResult.rows[0].db_size}`);
      
      client.release();
      await statusPool.end();
    } catch (error) {
      console.error('❌ Database status check failed:', error.code, error.message);
    }

    // Configuration 4: Test application-style connection
    console.log('\n📋 Test 4: Application-style connection...');
    try {
      // Mimic the application's connection configuration
      const appPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL.includes('sslmode=require') ? {
          rejectUnauthorized: false
        } : false,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });

      const client = await appPool.connect();
      
      // Test the specific query that's failing
      const clientsResult = await client.query(`
        SELECT id, company_name, logo_url 
        FROM clients 
        LIMIT 1
      `);
      console.log('✅ Application-style connection successful');
      console.log(`   Sample client: ${clientsResult.rows[0]?.company_name || 'No clients found'}`);
      
      client.release();
      await appPool.end();
    } catch (error) {
      console.error('❌ Application-style connection failed:', error.code, error.message);
      console.error('   Error details:', {
        severity: error.severity,
        code: error.code,
        detail: error.detail,
        hint: error.hint,
        routine: error.routine,
        file: error.file,
        line: error.line
      });
    }

    console.log('\n📋 Diagnosis Summary:');
    console.log('1. Check if database service is running and accessible');
    console.log('2. Verify connection limits haven\'t been exceeded');
    console.log('3. Confirm SSL configuration is correct');
    console.log('4. Check for network connectivity issues');
    console.log('5. Verify database credentials are still valid');

  } catch (error) {
    console.error('❌ Diagnosis failed:', error.message);
  }
}

diagnoseDatabaseConnection();
