require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function migrate() {
  try {
    const client = await pool.connect();
    console.log('Connected. Running ALTER TABLE...');
    await client.query(`
      ALTER TABLE meetings 
      ADD COLUMN IF NOT EXISTS room_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP;
    `);
    console.log('Migration successful.');
    client.release();
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    pool.end();
  }
}

migrate();
