import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { query } from '@/lib/db-postgres'

// GET /api/meetings - checks if a meeting exists or gets recent meetings
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')

    // If code query param is provided, validate meeting existence
    if (code) {
      const res = await query('SELECT * FROM meetings WHERE meeting_code = $1', [code.toUpperCase()])
      if (res.rows.length === 0) {
        return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
      }
      return NextResponse.json(res.rows[0], { status: 200 })
    }

    // Otherwise, require auth to fetch recent meetings for host
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 })
    }
    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as any

    const res = await query(
      `SELECT m.*, u.name as host_name, mh.duration
       FROM meetings m 
       JOIN users u ON m.host_id = u.id 
       LEFT JOIN meeting_history mh ON m.id = mh.meeting_id
       WHERE m.host_id = $1 
       ORDER BY m.created_at DESC LIMIT 10`,
      [decoded.id]
    )
    return NextResponse.json(res.rows, { status: 200 })
  } catch (error) {
    console.error('Meetings GET error:', error)
    return NextResponse.json({ error: 'Server or authentication error' }, { status: 500 })
  }
}

// POST /api/meetings - creates a new meeting code and stores it
export async function POST(request: Request) {
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

    const body = await request.json().catch(() => ({}))
    const roomName = body.roomName || 'Untitled Meeting'
    const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : new Date()

    // Generate CDV code: CDV-XXXX-XXXX
    const uuid = crypto.randomUUID().toUpperCase()
    const segments = uuid.split('-')
    const meetingCode = `CDV-${segments[1]}-${segments[2]}`

    const meetingId = crypto.randomUUID()

    // Insert meeting into DB
    await query(
      'INSERT INTO meetings (id, meeting_code, host_id, room_name, scheduled_at) VALUES ($1, $2, $3, $4, $5)',
      [meetingId, meetingCode, decoded.id, roomName, scheduledAt]
    )

    return NextResponse.json({ meetingId: meetingCode }, { status: 201 })
  } catch (error) {
    console.error('Meetings POST error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Server or database error' }, { status: 500 })
  }
}
