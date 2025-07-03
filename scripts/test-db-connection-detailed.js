#!/usr/bin/env node

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...\n');
  
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('❌ DATABASE_URL not found in environment variables');
    process.exit(1);
  }
  
  console.log('📋 Connection Details:');
  console.log(`   URL: ${connectionString.replace(/:[^:@]*@/, ':****@')}`);
  console.log(`   Provider: ${process.env.DATABASE_PROVIDER || 'unknown'}`);
  console.log(`   SSL: ${process.env.DATABASE_SSL || 'auto-detect'}`);
  console.log(`   TLS Reject Unauthorized: ${process.env.NODE_TLS_REJECT_UNAUTHORIZED}\n`);

  // Test different SSL configurations
  const sslConfigs = [
    {
      name: 'Current Config (Aiven optimized)',
      ssl: connectionString.includes('sslmode=require') ? {
        rejectUnauthorized: false
      } : false
    },
    {
      name: 'Strict SSL',
      ssl: connectionString.includes('sslmode=require') ? {
        rejectUnauthorized: true
      } : false
    },
    {
      name: 'No SSL',
      ssl: false
    }
  ];

  for (const config of sslConfigs) {
    console.log(`🧪 Testing: ${config.name}`);
    
    const pool = new Pool({
      connectionString,
      ssl: config.ssl,
      max: 1,
      connectionTimeoutMillis: 10000,
      statement_timeout: 30000,
      query_timeout: 30000,
    });

    try {
      const startTime = Date.now();
      const client = await pool.connect();
      const connectTime = Date.now() - startTime;
      
      console.log(`   ✅ Connection successful (${connectTime}ms)`);
      
      try {
        const queryStart = Date.now();
        const result = await client.query('SELECT NOW() as server_time, version() as version');
        const queryTime = Date.now() - queryStart;
        
        console.log(`   ✅ Query successful (${queryTime}ms)`);
        console.log(`   📅 Server time: ${result.rows[0].server_time}`);
        console.log(`   🗄️  Version: ${result.rows[0].version.split(' ')[0]}`);
        
        client.release();
        await pool.end();
        
        console.log(`   ✅ ${config.name} - WORKING\n`);
        return true;
        
      } catch (queryError) {
        console.log(`   ❌ Query failed: ${queryError.message}`);
        client.release();
        await pool.end();
      }
      
    } catch (connectionError) {
      console.log(`   ❌ Connection failed: ${connectionError.message}`);
      try {
        await pool.end();
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    
    console.log(`   ❌ ${config.name} - FAILED\n`);
  }
  
  return false;
}

async function testNetworkConnectivity() {
  console.log('🌐 Testing network connectivity...\n');
  
  const url = new URL(process.env.DATABASE_URL);
  const host = url.hostname;
  const port = url.port || 5432;
  
  console.log(`   Host: ${host}`);
  console.log(`   Port: ${port}`);
  
  // Test DNS resolution
  try {
    const dns = require('dns').promises;
    const addresses = await dns.lookup(host);
    console.log(`   ✅ DNS resolution: ${addresses.address}`);
  } catch (dnsError) {
    console.log(`   ❌ DNS resolution failed: ${dnsError.message}`);
    return false;
  }
  
  // Test TCP connection
  return new Promise((resolve) => {
    const net = require('net');
    const socket = new net.Socket();
    
    const timeout = setTimeout(() => {
      socket.destroy();
      console.log(`   ❌ TCP connection timeout (10s)`);
      resolve(false);
    }, 10000);
    
    socket.connect(port, host, () => {
      clearTimeout(timeout);
      console.log(`   ✅ TCP connection successful`);
      socket.destroy();
      resolve(true);
    });
    
    socket.on('error', (error) => {
      clearTimeout(timeout);
      console.log(`   ❌ TCP connection failed: ${error.message}`);
      resolve(false);
    });
  });
}

async function main() {
  console.log('🚀 Holitime Database Connection Test\n');
  
  const networkOk = await testNetworkConnectivity();
  if (!networkOk) {
    console.log('❌ Network connectivity issues detected. Check your internet connection and firewall settings.');
    process.exit(1);
  }
  
  const dbOk = await testDatabaseConnection();
  if (!dbOk) {
    console.log('❌ All database connection attempts failed.');
    console.log('\n🔧 Troubleshooting suggestions:');
    console.log('   1. Check if your IP is whitelisted in Aiven console');
    console.log('   2. Verify DATABASE_URL credentials');
    console.log('   3. Check if database is running');
    console.log('   4. Try connecting from a different network');
    process.exit(1);
  }
  
  console.log('✅ Database connection test completed successfully!');
}

main().catch(console.error);
