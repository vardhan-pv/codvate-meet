import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { query } from '@/lib/db-postgres'

// POST /api/meetings/end
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as any

    const body = await request.json().catch(() => ({}))
    const { meetingCode, durationSeconds } = body

    if (!meetingCode || durationSeconds === undefined) {
      return NextResponse.json({ error: 'Missing meetingCode or durationSeconds' }, { status: 400 })
    }

    // Verify host
    const meetingRes = await query('SELECT id, host_id FROM meetings WHERE meeting_code = $1', [meetingCode.toUpperCase()])
    if (meetingRes.rows.length === 0) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }
    const meeting = meetingRes.rows[0]
    
    // Only host can end meeting and save history
    if (meeting.host_id !== decoded.id) {
      return NextResponse.json({ error: 'Unauthorized: Only host can save history' }, { status: 403 })
    }
    
    const crypto = globalThis.crypto || require('crypto');
    const historyId = crypto.randomUUID()

    await query(
      'INSERT INTO meeting_history (id, meeting_id, duration) VALUES ($1, $2, $3)',
      [historyId, meeting.id, durationSeconds]
    )

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error('Meetings End POST error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
