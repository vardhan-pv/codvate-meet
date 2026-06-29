import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { query } from '@/lib/db-postgres'

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

    // Log the mock email dispatch to server console for testing
    console.log(`\n======================================================`)
    console.log(`[SECURITY DISPATCH] Verification code for ${email.toLowerCase()}: ${verificationCode}`)
    console.log(`======================================================\n`)

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
