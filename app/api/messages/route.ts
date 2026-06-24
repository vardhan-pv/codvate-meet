import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { query } from '@/lib/db-postgres'

// GET /api/messages?roomId=XXX
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const meetingCode = searchParams.get('roomId')
    
    if (!meetingCode) {
      return NextResponse.json({ error: 'Missing roomId' }, { status: 400 })
    }

    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as any

    // First get the internal meeting ID
    const meetingRes = await query('SELECT id FROM meetings WHERE meeting_code = $1', [meetingCode.toUpperCase()])
    if (meetingRes.rows.length === 0) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }
    const meetingId = meetingRes.rows[0].id

    // Fetch messages
    const res = await query(`
      SELECT m.id, m.message, m.created_at, u.name as sender_name, u.email as sender_email, m.user_id as sender_id
      FROM messages m
      JOIN users u ON m.user_id = u.id
      WHERE m.meeting_id = $1
      ORDER BY m.created_at ASC
    `, [meetingId])

    return NextResponse.json(res.rows, { status: 200 })
  } catch (error) {
    console.error('Messages GET error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST /api/messages
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as any

    const body = await request.json().catch(() => ({}))
    const { meetingCode, message } = body

    if (!meetingCode || !message) {
      return NextResponse.json({ error: 'Missing meetingCode or message' }, { status: 400 })
    }

    // Get internal meeting ID
    const meetingRes = await query('SELECT id FROM meetings WHERE meeting_code = $1', [meetingCode.toUpperCase()])
    if (meetingRes.rows.length === 0) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }
    const meetingId = meetingRes.rows[0].id
    
    // Fallback uuid generation
    const crypto = globalThis.crypto || require('crypto');
    const messageId = crypto.randomUUID()

    // Insert message
    const res = await query(
      'INSERT INTO messages (id, meeting_id, user_id, message) VALUES ($1, $2, $3, $4) RETURNING *',
      [messageId, meetingId, decoded.id, message]
    )

    return NextResponse.json({
      id: messageId,
      message,
      sender_id: decoded.id,
      sender_name: decoded.name,
      created_at: res.rows[0].created_at
    }, { status: 201 })
  } catch (error) {
    console.error('Messages POST error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
