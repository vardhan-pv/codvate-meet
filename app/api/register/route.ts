import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { query } from '@/lib/db-postgres'
import { sendEmail } from '@/lib/email'

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json()

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Missing name, email, or password' }, { status: 400 })
    }

    // 1. Email Format Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email address format' }, { status: 400 })
    }

    // 2. Strong Password Complexity Validation (min 8 chars, uppercase, lowercase, number, symbol)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+=\[\]{}|\\;:\'",.<>?/~`\-]).{8,}$/
    if (!passwordRegex.test(password)) {
      return NextResponse.json({
        error: 'Password must be at least 8 characters long and contain uppercase, lowercase, a number, and a special character.'
      }, { status: 400 })
    }

    // Check if user already exists
    const checkUser = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()])
    if (checkUser.rows.length > 0) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)
    const userId = crypto.randomUUID()
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()

    // Insert user with default is_verified: false and role: 'user'
    await query(
      'INSERT INTO users (id, name, email, password, verification_code, is_verified, role) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [userId, name, email.toLowerCase(), hashedPassword, verificationCode, false, 'user']
    )

    // Dispatch confirmation email (real SMTP or logging fallback)
    await sendEmail({
      to: email.toLowerCase(),
      subject: 'Confirm Your CodovateMeet Email',
      text: `Welcome to CodovateMeet, ${name}! Your 6-digit email confirmation code is: ${verificationCode}`,
      html: `
        <div style="font-family: sans-serif; padding: 24px; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <h2 style="color: #2563eb; font-weight: 800; font-family: sans-serif; margin-bottom: 16px;">Welcome to CodovateMeet!</h2>
          <p style="font-size: 14px; color: #334155; line-height: 1.6;">Hi ${name},</p>
          <p style="font-size: 14px; color: #334155; line-height: 1.6;">Thank you for signing up. Please enter the following 6-digit confirmation code on the activation screen to verify your email address:</p>
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; font-family: monospace; font-size: 28px; font-weight: bold; text-align: center; padding: 16px; margin: 24px 0; border-radius: 8px; letter-spacing: 4px; color: #1e293b;">
            ${verificationCode}
          </div>
          <p style="color: #64748b; font-size: 11px; line-height: 1.5; border-top: 1px solid #e2e8f0; padding-top: 12px;">If you did not register for this account, you can safely ignore this email.</p>
        </div>
      `
    })

    // Write security audit log
    await query(
      'INSERT INTO security_logs (id, event_type, user_id, details) VALUES ($1, $2, $3, $4)',
      [
        crypto.randomUUID(),
        'SIGNUP',
        userId,
        `User ${email.toLowerCase()} registered. Verification code ${verificationCode} generated.`
      ]
    )

    return NextResponse.json({
      id: userId,
      name,
      email: email.toLowerCase(),
      message: 'Registration successful! Verification code sent.'
    }, { status: 201 })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json({ error: 'Database or server error' }, { status: 500 })
  }
}
