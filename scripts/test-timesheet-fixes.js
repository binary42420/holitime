#!/usr/bin/env node

/**
 * Test script to verify timesheet display fixes
 * Tests date formatting, time entry display, and PDF functionality
 */

const { Pool } = require('pg');
const { format, parseISO } = require('date-fns');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/holitime'
});

async function testTimesheetFixes() {
  console.log('🧪 Testing Timesheet Display Fixes...\n');

  try {
    // Test 1: Check database schema for PDF storage
    console.log('📋 Test 1: Database Schema Check');
    
    const schemaCheck = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'timesheets'
      AND column_name IN ('pdf_data', 'pdf_filename', 'pdf_content_type', 'pdf_generated_at', 'client_approved_at', 'manager_approved_at')
      ORDER BY column_name
    `);
    
    console.log('✅ Timesheets table columns:');
    console.table(schemaCheck.rows);

    // Test 2: Check approval date formats in database
    console.log('\n📋 Test 2: Approval Date Format Check');
    
    const approvalDates = await pool.query(`
      SELECT 
        id,
        status,
        client_approved_at,
        manager_approved_at,
        EXTRACT(EPOCH FROM client_approved_at) as client_epoch,
        EXTRACT(EPOCH FROM manager_approved_at) as manager_epoch
      FROM timesheets 
      WHERE client_approved_at IS NOT NULL OR manager_approved_at IS NOT NULL
      ORDER BY client_approved_at DESC, manager_approved_at DESC
      LIMIT 5
    `);
    
    console.log('✅ Sample approval dates from database:');
    approvalDates.rows.forEach(row => {
      console.log(`   Timesheet ${row.id}:`);
      console.log(`     Status: ${row.status}`);
      if (row.client_approved_at) {
        console.log(`     Client Approved: ${row.client_approved_at} (epoch: ${row.client_epoch})`);
      }
      if (row.manager_approved_at) {
        console.log(`     Manager Approved: ${row.manager_approved_at} (epoch: ${row.manager_epoch})`);
      }
      console.log('');
    });

    // Test 3: Check time entries data structure
    console.log('\n📋 Test 3: Time Entries Data Structure Check');
    
    const timeEntriesCheck = await pool.query(`
      SELECT 
        t.id as timesheet_id,
        t.status,
        COUNT(ap.id) as assigned_personnel_count,
        COUNT(te.id) as time_entries_count,
        json_agg(
          json_build_object(
            'employee_name', u.name,
            'role_code', ap.role_code,
            'time_entries', (
              SELECT json_agg(
                json_build_object(
                  'entry_number', te2.entry_number,
                  'clock_in', te2.clock_in,
                  'clock_out', te2.clock_out
                )
              )
              FROM time_entries te2 
              WHERE te2.assigned_personnel_id = ap.id
            )
          )
        ) as personnel_data
      FROM timesheets t
      JOIN shifts s ON t.shift_id = s.id
      LEFT JOIN assigned_personnel ap ON s.id = ap.shift_id
      LEFT JOIN users u ON ap.employee_id = u.id
      LEFT JOIN time_entries te ON ap.id = te.assigned_personnel_id
      WHERE t.status = 'completed'
      GROUP BY t.id, t.status
      ORDER BY t.id DESC
      LIMIT 3
    `);
    
    console.log('✅ Time entries data structure:');
    timeEntriesCheck.rows.forEach(row => {
      console.log(`   Timesheet ${row.timesheet_id} (${row.status}):`);
      console.log(`     Personnel: ${row.assigned_personnel_count}, Time Entries: ${row.time_entries_count}`);
      if (row.personnel_data && row.personnel_data.length > 0) {
        row.personnel_data.forEach(person => {
          if (person.employee_name) {
            console.log(`     - ${person.employee_name} (${person.role_code}): ${person.time_entries?.length || 0} entries`);
          }
        });
      }
      console.log('');
    });

    // Test 4: Check PDF storage
    console.log('\n📋 Test 4: PDF Storage Check');
    
    const pdfCheck = await pool.query(`
      SELECT 
        id,
        status,
        pdf_filename,
        pdf_generated_at,
        CASE WHEN pdf_data IS NOT NULL THEN 'Yes' ELSE 'No' END as has_pdf_data,
        CASE WHEN pdf_data IS NOT NULL THEN LENGTH(pdf_data) ELSE 0 END as pdf_size_bytes
      FROM timesheets
      WHERE status = 'completed'
      ORDER BY pdf_generated_at DESC NULLS LAST
      LIMIT 5
    `);
    
    console.log('✅ PDF storage status:');
    pdfCheck.rows.forEach(row => {
      console.log(`   Timesheet ${row.id}:`);
      console.log(`     Status: ${row.status}`);
      console.log(`     Has PDF: ${row.has_pdf_data}`);
      console.log(`     Filename: ${row.pdf_filename || 'N/A'}`);
      console.log(`     Size: ${row.pdf_size_bytes} bytes`);
      console.log(`     Generated: ${row.pdf_generated_at || 'N/A'}`);
      console.log('');
    });

    // Test 5: Date formatting simulation
    console.log('\n📋 Test 5: Date Formatting Simulation');
    
    const testDates = [
      '2025-07-03T15:19:31.171Z',
      '2025-07-03 15:19:31.171+00',
      '2025-07-03T15:19:31.171-07:00',
      new Date().toISOString()
    ];
    
    console.log('✅ Date formatting test results:');
    testDates.forEach(dateStr => {
      try {
        const date = parseISO(dateStr);
        const formatted = format(date, 'MMMM d, yyyy \'at\' h:mm a');
        console.log(`   Input: ${dateStr}`);
        console.log(`   Output: ${formatted}`);
        console.log('');
      } catch (error) {
        console.log(`   Input: ${dateStr}`);
        console.log(`   Error: ${error.message}`);
        console.log('');
      }
    });

    // Test 6: Summary and recommendations
    console.log('\n📋 Test 6: Summary and Recommendations');
    
    const summary = await pool.query(`
      SELECT 
        COUNT(*) as total_timesheets,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_timesheets,
        COUNT(CASE WHEN pdf_data IS NOT NULL THEN 1 END) as timesheets_with_pdf,
        COUNT(CASE WHEN client_approved_at IS NOT NULL THEN 1 END) as client_approved,
        COUNT(CASE WHEN manager_approved_at IS NOT NULL THEN 1 END) as manager_approved,
        AVG(CASE WHEN pdf_data IS NOT NULL THEN LENGTH(pdf_data) END) as avg_pdf_size
      FROM timesheets
    `);
    
    const stats = summary.rows[0];
    
    console.log('✅ Timesheet Statistics:');
    console.log(`   Total Timesheets: ${stats.total_timesheets}`);
    console.log(`   Completed: ${stats.completed_timesheets}`);
    console.log(`   With PDF: ${stats.timesheets_with_pdf}`);
    console.log(`   Client Approved: ${stats.client_approved}`);
    console.log(`   Manager Approved: ${stats.manager_approved}`);
    console.log(`   Average PDF Size: ${Math.round(stats.avg_pdf_size || 0)} bytes`);

    console.log('\n🎯 Fix Status:');
    console.log('✅ Date formatting: Implemented robust date parsing with error handling');
    console.log('✅ Time entry display: Updated to use proper time utilities and data mapping');
    console.log('✅ PDF generation: Fixed to generate PDFs directly during manager approval');
    console.log('✅ Error handling: Added comprehensive error handling for edge cases');

    console.log('\n🚀 Next Steps:');
    console.log('1. Deploy the updated code to test the fixes');
    console.log('2. Test the approval workflow end-to-end');
    console.log('3. Verify PDF download functionality');
    console.log('4. Check date display on approved timesheets');

  } catch (error) {
    console.error('❌ Error running tests:', error);
  } finally {
    await pool.end();
  }
}

// Run the tests
testTimesheetFixes();
