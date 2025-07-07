async function up() {
  try {
    const { query } = await import('../src/lib/db.ts');
    await query(`
      ALTER TABLE users
      ADD COLUMN is_rigger_eligible BOOLEAN DEFAULT false
    `);
    console.log('Migration successful: Added is_rigger_eligible to users table');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

up();
