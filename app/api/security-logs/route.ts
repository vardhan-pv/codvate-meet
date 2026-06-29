import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { query } from '@/lib/db-postgres'

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized session' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret')
    const userId = decoded.id

    // Fetch security logs
    const res = await query(
      'SELECT event_type, details, created_at, ip_address FROM security_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [userId]
    )

    return NextResponse.json(res.rows, { status: 200 })
  } catch (error) {
    console.error('Security logs API error:', error)
    return NextResponse.json({ error: 'Unauthorized or database error' }, { status: 401 })
  }
}
