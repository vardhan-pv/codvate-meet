import { NextResponse } from 'next/server'
import { query } from '@/lib/db-postgres'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Missing email address' }, { status: 400 })
    }

    const res = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()])
    
    // Enum attack prevention: always return success message
    const successResponse = { message: 'If the email matches an account, a password reset link has been dispatched.' }

    if (res.rows.length === 0) {
      return NextResponse.json(successResponse, { status: 200 })
    }

    const user = res.rows[0]
    const resetToken = crypto.randomUUID()
    const expiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hour expiry

    await query(
      'UPDATE users SET reset_token = $1, reset_expires = $2 WHERE id = $3',
      [resetToken, expiry, user.id]
    )

    // Log the reset link dispatch mock to console
    console.log(`\n======================================================`)
    console.log(`[SECURITY DISPATCH] Password reset link for ${email.toLowerCase()}:`)
    console.log(`http://localhost:3000/reset-password?token=${resetToken}`)
    console.log(`======================================================\n`)

    // Write audit log
    await query(
      'INSERT INTO security_logs (id, event_type, user_id, details) VALUES ($1, $2, $3, $4)',
      [crypto.randomUUID(), 'PASSWORD_RESET_REQUESTED', user.id, `Password reset token generated for user.`]
    )

    return NextResponse.json(successResponse, { status: 200 })
  } catch (error) {
    console.error('Forgot password endpoint error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
