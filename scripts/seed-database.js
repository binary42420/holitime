const { config } = require('dotenv');
const path = require('path');
const { Pool } = require('pg');

// Load environment variables
config({ path: path.join(__dirname, '..', '.env.local') });

async function seedDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🌱 Starting database seeding...');
    
    // Create sample users (no password hashing)
    const password = 'password123';

    // Insert admin user
    const adminResult = await pool.query(`
      INSERT INTO users (email, password_hash, name, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, ['sam.c@handson.com', password, 'Sam C', 'Manager/Admin']);
    const adminId = adminResult.rows[0].id;
    console.log('✅ Admin user created:', adminId);

    // Insert crew chief
    const crewChiefResult = await pool.query(`
      INSERT INTO users (email, password_hash, name, role, certifications, performance, location)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, ['john.chief@handson.com', passwordHash, 'John Chief', 'Crew Chief', ['Safety', 'Equipment'], 4.8, 'Downtown']);
    const crewChiefId = crewChiefResult.rows[0].id;
    console.log('✅ Crew chief created:', crewChiefId);

    // Insert employees
    const employee1Result = await pool.query(`
      INSERT INTO users (email, password_hash, name, role, certifications, performance, location)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, ['mike.worker@handson.com', passwordHash, 'Mike Worker', 'Employee', ['Stage Setup'], 4.2, 'Downtown']);
    const employee1Id = employee1Result.rows[0].id;

    const employee2Result = await pool.query(`
      INSERT INTO users (email, password_hash, name, role, certifications, performance, location)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, ['sarah.tech@handson.com', passwordHash, 'Sarah Tech', 'Employee', ['Audio', 'Lighting'], 4.6, 'Midtown']);
    const employee2Id = employee2Result.rows[0].id;
    console.log('✅ Employees created');

    // Insert client
    const clientResult = await pool.query(`
      INSERT INTO users (email, password_hash, name, role, company_name, company_address, contact_person, contact_email, contact_phone)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `, [
      'contact@cityparks.gov', 
      passwordHash, 
      'City Parks Department', 
      'Client',
      'City Parks Department',
      '123 Main St, City Hall, NY 10001',
      'Jane Parks',
      'jane.parks@cityparks.gov',
      '(555) 123-4567'
    ]);
    const clientId = clientResult.rows[0].id;
    console.log('✅ Client created:', clientId);

    // Insert sample job
    const jobResult = await pool.query(`
      INSERT INTO jobs (name, client_id, description)
      VALUES ($1, $2, $3)
      RETURNING id
    `, ['City Park Festival', clientId, 'Annual summer festival in Central Park with multiple stages and vendor areas']);
    const jobId = jobResult.rows[0].id;
    console.log('✅ Sample job created:', jobId);

    // Insert sample shifts
    const shift1Result = await pool.query(`
      INSERT INTO shifts (job_id, date, start_time, end_time, location, crew_chief_id, status, notes, requested_workers)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `, [jobId, '2024-07-15', '08:00', '18:00', 'Central Park Main Stage', crewChiefId, 'Upcoming', 'Setup and breakdown for main stage', 5]);
    const shift1Id = shift1Result.rows[0].id;

    const shift2Result = await pool.query(`
      INSERT INTO shifts (job_id, date, start_time, end_time, location, crew_chief_id, status, notes, requested_workers)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `, [jobId, '2024-07-16', '09:00', '17:00', 'Central Park Vendor Area', crewChiefId, 'Upcoming', 'Vendor setup and support', 3]);
    const shift2Id = shift2Result.rows[0].id;
    console.log('✅ Sample shifts created');

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`- Admin user: sam.c@handson.com (password: password123)`);
    console.log(`- Crew chief: john.chief@handson.com`);
    console.log(`- Employees: mike.worker@handson.com, sarah.tech@handson.com`);
    console.log(`- Client: contact@cityparks.gov`);
    console.log(`- Job: City Park Festival`);
    console.log(`- Shifts: 2 upcoming shifts`);
    
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

seedDatabase();
