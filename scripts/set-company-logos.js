const { Pool } = require('pg');

async function setCompanyLogos() {
  const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'holitime',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
  });

  try {
    console.log('🚀 Setting company logos for Maktive and Show Imaging...');

    // Update Maktive logo
    const maktiveResult = await pool.query(`
      UPDATE clients 
      SET logo_url = '/logos/maktive-logo.png'
      WHERE LOWER(company_name) LIKE '%maktive%'
      RETURNING id, company_name, logo_url
    `);

    if (maktiveResult.rows.length > 0) {
      console.log('✅ Updated Maktive logo:');
      console.table(maktiveResult.rows);
    } else {
      console.log('⚠️  No Maktive company found. Creating placeholder...');
      
      // Create Maktive client company if it doesn't exist
      const createMaktive = await pool.query(`
        INSERT INTO clients (company_name, logo_url, created_at, updated_at)
        VALUES ('Maktive', '/logos/maktive-logo.png', NOW(), NOW())
        RETURNING id, company_name, logo_url
      `);
      
      console.log('✅ Created Maktive company:');
      console.table(createMaktive.rows);
    }

    // Update Show Imaging logo
    const showImagingResult = await pool.query(`
      UPDATE clients 
      SET logo_url = '/logos/show-imaging-logo.png'
      WHERE LOWER(company_name) LIKE '%show imaging%'
      RETURNING id, company_name, logo_url
    `);

    if (showImagingResult.rows.length > 0) {
      console.log('✅ Updated Show Imaging logo:');
      console.table(showImagingResult.rows);
    } else {
      console.log('⚠️  No Show Imaging company found. Creating placeholder...');
      
      // Create Show Imaging client company if it doesn't exist
      const createShowImaging = await pool.query(`
        INSERT INTO clients (company_name, logo_url, created_at, updated_at)
        VALUES ('Show Imaging', '/logos/show-imaging-logo.png', NOW(), NOW())
        RETURNING id, company_name, logo_url
      `);
      
      console.log('✅ Created Show Imaging company:');
      console.table(createShowImaging.rows);
    }

    // List all companies with logos
    const allLogos = await pool.query(`
      SELECT company_name, logo_url 
      FROM clients 
      WHERE logo_url IS NOT NULL
      ORDER BY company_name
    `);

    console.log('📋 All companies with logos:');
    console.table(allLogos.rows);

  } catch (error) {
    console.error('❌ Error setting company logos:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  setCompanyLogos().catch(console.error);
}

module.exports = { setCompanyLogos };
