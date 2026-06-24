import { NextResponse } from 'next/server'
import { AccessToken } from 'livekit-server-sdk'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const room = searchParams.get('room')
    const identity = searchParams.get('identity')

    if (!room || !identity) {
      return NextResponse.json({ error: 'Missing room or identity' }, { status: 400 })
    }

    const apiKey = process.env.LIVEKIT_API_KEY
    const apiSecret = process.env.LIVEKIT_API_SECRET
    const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || process.env.LIVEKIT_URL

    if (!apiKey || !apiSecret) {
      console.error('LiveKit credentials are not defined in .env.local')
      return NextResponse.json({ error: 'LiveKit server credentials not configured' }, { status: 500 })
    }

    // Generate LiveKit token
    const at = new AccessToken(apiKey, apiSecret, {
      identity: identity
    })

    at.addGrant({
      roomJoin: true,
      room: room,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true
    })

    const token = await at.toJwt()

    return NextResponse.json({ token, serverUrl: wsUrl }, { status: 200 })
  } catch (error) {
    console.error('LiveKit token generation error:', error)
    return NextResponse.json({ error: 'Token generation failed' }, { status: 500 })
  }
}
