import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { query } from '@/lib/db-postgres'

export async function POST(request: Request) {
  try {
    const { token, newPassword } = await request.json()

    if (!token || !newPassword) {
      return NextResponse.json({ error: 'Missing token or new password' }, { status: 400 })
    }

    // 1. Password Complexity check
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+=\[\]{}|\\;:\'",.<>?/~`\-]).{8,}$/
    if (!passwordRegex.test(newPassword)) {
      return NextResponse.json({
        error: 'Password must be at least 8 characters long and contain uppercase, lowercase, a number, and a special character.'
      }, { status: 400 })
    }

    // 2. Validate token
    const res = await query(
      'SELECT * FROM users WHERE reset_token = $1 AND reset_expires > CURRENT_TIMESTAMP',
      [token]
    )

    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Password reset token is invalid or has expired.' }, { status: 400 })
    }

    const user = res.rows[0]

    // 3. Hash and update password
    const hashedPassword = await bcrypt.hash(newPassword, 10)
    await query(
      'UPDATE users SET password = $1, reset_token = NULL, reset_expires = NULL WHERE id = $2',
      [hashedPassword, user.id]
    )

    // Write security audit log
    await query(
      'INSERT INTO security_logs (id, event_type, user_id, details) VALUES ($1, $2, $3, $4)',
      [crypto.randomUUID(), 'PASSWORD_RESET_SUCCESSFUL', user.id, `User password reset successfully completed.`]
    )

    return NextResponse.json({ message: 'Password has been successfully updated!' }, { status: 200 })
  } catch (error) {
    console.error('Reset password endpoint error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
