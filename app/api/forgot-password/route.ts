import { NextResponse } from 'next/server'
import { query } from '@/lib/db-postgres'
import { sendEmail } from '@/lib/email'

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

    // Dispatch password reset email (real SMTP or logging fallback)
    await sendEmail({
      to: email.toLowerCase(),
      subject: 'Reset Your CodovateMeet Password',
      text: `Hello! You requested to reset your password. Click this link to choose a new password: http://localhost:3000/reset-password?token=${resetToken}`,
      html: `
        <div style="font-family: sans-serif; padding: 24px; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <h2 style="color: #2563eb; font-weight: 800; font-family: sans-serif; margin-bottom: 16px;">Reset Your Password</h2>
          <p style="font-size: 14px; color: #334155; line-height: 1.6;">Hello,</p>
          <p style="font-size: 14px; color: #334155; line-height: 1.6;">We received a request to reset the password for your CodovateMeet account. Click the button below to configure your new credentials (valid for 1 hour):</p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="http://localhost:3000/reset-password?token=${resetToken}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; font-weight: bold; text-decoration: none; border-radius: 8px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p style="color: #64748b; font-size: 11px; line-height: 1.5; border-top: 1px solid #e2e8f0; padding-top: 12px;">If you did not request a password reset, you can safely ignore this email.</p>
        </div>
      `
    })

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
