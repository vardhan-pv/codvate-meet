import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { query } from '@/lib/db-postgres'

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized session' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret')
    const userId = decoded.id

    const body = await request.json().catch(() => ({}))
    const { action, code } = body

    if (action === 'generate') {
      // Generate a mock base32 secret
      const mfaSecret = Math.random().toString(36).substring(2, 10).toUpperCase()
      
      await query('UPDATE users SET mfa_secret = $1 WHERE id = $2', [mfaSecret, userId])

      return NextResponse.json({ secret: mfaSecret, qrcode: `otpauth://totp/CodovateMeet:${decoded.email}?secret=${mfaSecret}&issuer=CodovateMeet` }, { status: 200 })
    }

    if (action === 'confirm') {
      if (!code) {
        return NextResponse.json({ error: 'Verification code required' }, { status: 400 })
      }

      // Check user record
      const res = await query('SELECT * FROM users WHERE id = $1', [userId])
      if (res.rows.length === 0) return NextResponse.json({ error: 'User not found' }, { status: 404 })
      const user = res.rows[0]

      if (!user.mfa_secret) {
        return NextResponse.json({ error: 'MFA setup not initialized.' }, { status: 400 })
      }

      // Mock verify: accept any 6-digit number for convenience, or verify '123456'
      if (code !== '123456' && code.length !== 6) {
        return NextResponse.json({ error: 'Invalid MFA verification code. (Hint: Use 123456 to confirm)' }, { status: 400 })
      }

      // Enable MFA
      await query('UPDATE users SET mfa_enabled = TRUE WHERE id = $1', [userId])

      // Log setup success
      await query(
        'INSERT INTO security_logs (id, event_type, user_id, details) VALUES ($1, $2, $3, $4)',
        [crypto.randomUUID(), 'MFA_ENABLED', userId, `Two-Factor authentication successfully enabled.`]
      )

      return NextResponse.json({ success: true, message: 'Two-Factor Authentication is now enabled!' }, { status: 200 })
    }

    if (action === 'disable') {
      await query('UPDATE users SET mfa_enabled = FALSE, mfa_secret = NULL WHERE id = $1', [userId])
      
      // Log setup disable
      await query(
        'INSERT INTO security_logs (id, event_type, user_id, details) VALUES ($1, $2, $3, $4)',
        [crypto.randomUUID(), 'MFA_DISABLED', userId, `Two-Factor authentication disabled.`]
      )

      return NextResponse.json({ success: true, message: 'Two-Factor Authentication disabled.' }, { status: 200 })
    }

    return NextResponse.json({ error: 'Invalid setup action' }, { status: 400 })
  } catch (error) {
    console.error('MFA setup error:', error)
    return NextResponse.json({ error: 'Unauthorized or server error' }, { status: 401 })
  }
}
