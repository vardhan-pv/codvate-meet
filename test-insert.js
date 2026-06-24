require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function testInsert() {
  try {
    const client = await pool.connect();
    console.log('Connected.');
    
    const meetingId = 'test-id-123';
    const meetingCode = 'CDV-TEST-1234';
    // Let's get the host_id of the user
    const userRes = await client.query('SELECT id FROM users LIMIT 1');
    if (userRes.rows.length === 0) {
      console.log('No users found.');
      return;
    }
    const hostId = userRes.rows[0].id;
    
    const roomName = 'Untitled Meeting';
    const scheduledAt = new Date(); // Or what if it's null?
    
    try {
      await client.query(
        'INSERT INTO meetings (id, meeting_code, host_id, room_name, scheduled_at) VALUES ($1, $2, $3, $4, $5)',
        [meetingId, meetingCode, hostId, roomName, scheduledAt]
      );
      console.log('Insert successful!');
    } catch (e) {
      console.error('Insert failed:', e);
    }
    
    client.release();
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    pool.end();
  }
}

testInsert();
