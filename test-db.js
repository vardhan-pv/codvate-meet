require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function test() {
  try {
    const client = await pool.connect();
    console.log('Connected successfully!');
    const res = await client.query('SELECT * FROM users');
    console.log('Users:', res.rows);
    client.release();
  } catch (err) {
    console.error('Connection error:', err);
  } finally {
    pool.end();
  }
}

test();
