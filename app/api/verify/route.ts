import { NextResponse } from 'next/server'
import { query } from '@/lib/db-postgres'

export async function POST(request: Request) {
  try {
    const { userId, code } = await request.json()

    if (!userId || !code) {
      return NextResponse.json({ error: 'Missing userId or verification code' }, { status: 400 })
    }

    const res = await query('SELECT * FROM users WHERE id = $1', [userId])
    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const user = res.rows[0]
    if (user.verification_code !== code.trim()) {
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 })
    }

    // Set user as verified
    await query('UPDATE users SET is_verified = TRUE, verification_code = NULL WHERE id = $1', [userId])

    // Write security log
    await query(
      'INSERT INTO security_logs (id, event_type, user_id, details) VALUES ($1, $2, $3, $4)',
      [crypto.randomUUID(), 'EMAIL_VERIFICATION_SUCCESS', userId, `User email successfully verified.`]
    )

    return NextResponse.json({ message: 'Account successfully verified!' }, { status: 200 })
  } catch (error) {
    console.error('Verify endpoint error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
