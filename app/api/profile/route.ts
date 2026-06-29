import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { query } from '@/lib/db-postgres'

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as any

    if (!decoded || !decoded.id) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 })
    }

    // Optional: verify user still exists in DB
    const res = await query('SELECT id, name, email, is_verified, mfa_enabled, role FROM users WHERE id = $1', [decoded.id])
    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(res.rows[0], { status: 200 })
  } catch (error) {
    console.error('Profile API error:', error)
    return NextResponse.json({ error: 'Unauthorized: Token expired or invalid' }, { status: 401 })
  }
}
