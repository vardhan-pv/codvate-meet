import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { query } from '@/lib/db-postgres'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing email or password' }, { status: 400 })
    }

    // Fetch user
    const res = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()])
    if (res.rows.length === 0) {
      // General error message security (do not disclose if user exists)
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const user = res.rows[0]

    // 1. Check account lockout status
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const diffMs = new Date(user.locked_until).getTime() - Date.now()
      const diffMins = Math.ceil(diffMs / 60000)
      return NextResponse.json({
        error: `Account locked due to consecutive failed attempts. Try again in ${diffMins} minute(s).`
      }, { status: 403 })
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      // 2. Increment failed login attempts
      const currentAttempts = (user.login_attempts || 0) + 1
      if (currentAttempts >= 5) {
        const lockoutTime = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes lockout
        await query(
          'UPDATE users SET login_attempts = $1, locked_until = $2 WHERE id = $3',
          [currentAttempts, lockoutTime, user.id]
        )
        // Log security alert
        await query(
          'INSERT INTO security_logs (id, event_type, user_id, details) VALUES ($1, $2, $3, $4)',
          [crypto.randomUUID(), 'ACCOUNT_LOCKED', user.id, `Account locked. Too many failed attempts.`]
        )
        return NextResponse.json({
          error: 'Too many failed login attempts. Account locked for 15 minutes.'
        }, { status: 403 })
      } else {
        await query('UPDATE users SET login_attempts = $1 WHERE id = $2', [currentAttempts, user.id])
        await query(
          'INSERT INTO security_logs (id, event_type, user_id, details) VALUES ($1, $2, $3, $4)',
          [crypto.randomUUID(), 'FAILED_LOGIN_ATTEMPT', user.id, `Failed password attempt ${currentAttempts}/5.`]
        )
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
      }
    }

    // 3. Reset failed login attempts on successful login
    await query('UPDATE users SET login_attempts = 0, locked_until = NULL WHERE id = $1', [user.id])

    // 4. Enforce Signup Verification
    if (user.is_verified === false) {
      return NextResponse.json({
        error: 'Please verify your email address to continue.',
        isUnverified: true,
        userId: user.id
      }, { status: 403 })
    }

    // 5. Multi-Factor Authentication (MFA) check
    if (user.mfa_enabled) {
      return NextResponse.json({
        mfaRequired: true,
        userId: user.id,
        message: 'Two-factor authentication code required.'
      }, { status: 200 })
    }

    // Generate standard JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role || 'user' },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '7d' }
    )

    // Write security audit log
    await query(
      'INSERT INTO security_logs (id, event_type, user_id, details) VALUES ($1, $2, $3, $4)',
      [crypto.randomUUID(), 'SUCCESSFUL_LOGIN', user.id, `User signed in successfully. Session initialized.`]
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
    console.error('Login API error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
