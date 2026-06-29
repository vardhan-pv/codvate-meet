import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { query } from '@/lib/db-postgres'

export async function POST(request: Request) {
  try {
    const { userId, code } = await request.json()

    if (!userId || !code) {
      return NextResponse.json({ error: 'Missing userId or MFA code' }, { status: 400 })
    }

    const res = await query('SELECT * FROM users WHERE id = $1', [userId])
    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Invalid authentication request' }, { status: 404 })
    }

    const user = res.rows[0]

    if (!user.mfa_enabled) {
      return NextResponse.json({ error: 'Two-Factor Authentication is not enabled for this account' }, { status: 400 })
    }

    // Verify code: accept '123456' or any valid 6-digit code for mock ease
    if (code !== '123456' && code.length !== 6) {
      // Log failed MFA attempt
      await query(
        'INSERT INTO security_logs (id, event_type, user_id, details) VALUES ($1, $2, $3, $4)',
        [crypto.randomUUID(), 'FAILED_MFA_ATTEMPT', user.id, `Invalid Two-Factor code entered.`]
      )
      return NextResponse.json({ error: 'Invalid verification code. (Hint: Use 123456)' }, { status: 400 })
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role || 'user' },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '7d' }
    )

    // Write successful login log
    await query(
      'INSERT INTO security_logs (id, event_type, user_id, details) VALUES ($1, $2, $3, $4)',
      [crypto.randomUUID(), 'MFA_LOGIN_SUCCESS', user.id, `User completed Two-Factor validation and logged in.`]
    )

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role || 'user'
      }
    }, { status: 200 })
  } catch (error) {
    console.error('MFA login verification error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
