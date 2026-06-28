'use client'

import { use, useEffect, useState, useRef } from 'react'
import { Room, RoomEvent, LocalVideoTrack, createLocalVideoTrack } from 'livekit-client'
import { useAuth } from '@/hooks/useAuth'
import { livekitService } from '@/services/livekit'
import { meetingService } from '@/services/meeting'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Mic, MicOff, Video, VideoOff, PhoneOff, Users, MessageSquare, MonitorUp, ShieldAlert, X, Maximize2, Minimize2, Subtitles } from 'lucide-react'

interface RoomPageProps {
  params: Promise<{
    roomId: string
  }>
}

const getDisplayName = (identity: string) => {
  if (!identity) return 'Unknown'
  const index = identity.lastIndexOf('_')
  if (index !== -1) {
    return identity.substring(0, index)
  }
  return identity
}

function VideoTile({ participant, source, isPinned, onTogglePin, trackPub }: { participant: any, source: 'camera' | 'screen_share', isPinned: boolean, onTogglePin: () => void, trackPub: any }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const [videoEnabled, setVideoEnabled] = useState(false)
  const [audioMuted, setAudioMuted] = useState(false)

  useEffect(() => {
    let videoTrack: any = null
    let audioTrack: any = null

    const attachTracks = () => {
      const videoPub = trackPub || Array.from(participant.trackPublications.values()).find(
        (pub: any) => pub.source === source || (source === 'camera' && pub.kind === 'video' && pub.source !== 'screen_share')
      ) as any

      if (videoPub && videoPub.track) {
        const isReady = participant.isLocal || videoPub.isSubscribed
        if (isReady) {
          videoTrack = videoPub.track
          if (videoRef.current) {
            videoRef.current.muted = true
            videoRef.current.playsInline = true
            videoTrack.attach(videoRef.current)
            videoRef.current.play().catch((e: any) => console.warn("video play error:", e))
          }
          setVideoEnabled(!videoPub.isMuted)
        } else {
          setVideoEnabled(false)
        }
      } else {
        setVideoEnabled(false)
      }

      // Only attach audio to the camera tile of remote participants to avoid echo/duplicate audio
      if (!participant.isLocal && source === 'camera') {
        const audioPub = Array.from(participant.trackPublications.values()).find(
          (pub: any) => pub.kind === 'audio'
        ) as any
        if (audioPub && audioPub.track && audioPub.isSubscribed) {
          audioTrack = audioPub.track
          if (audioRef.current) {
            audioTrack.attach(audioRef.current)
            audioRef.current.play().catch((e: any) => console.warn("audio play error:", e))
          }
          setAudioMuted(audioPub.isMuted)
        }
      }
    }

    attachTracks()

    participant.on('trackPublished', attachTracks)
    participant.on('trackUnpublished', attachTracks)
    participant.on('trackSubscribed', attachTracks)
    participant.on('trackUnsubscribed', attachTracks)
    participant.on('trackMuted', attachTracks)
    participant.on('trackUnmuted', attachTracks)
    participant.on('localTrackPublished', attachTracks)
    participant.on('localTrackUnpublished', attachTracks)

    return () => {
      if (videoTrack && videoRef.current) try { videoTrack.detach(videoRef.current) } catch (e) {}
      if (audioTrack && audioRef.current) try { audioTrack.detach(audioRef.current) } catch (e) {}
      participant.off('trackPublished', attachTracks)
      participant.off('trackUnpublished', attachTracks)
      participant.off('trackSubscribed', attachTracks)
      participant.off('trackUnsubscribed', attachTracks)
      participant.off('trackMuted', attachTracks)
      participant.off('trackUnmuted', attachTracks)
      participant.off('localTrackPublished', attachTracks)
      participant.off('localTrackUnpublished', attachTracks)
    }
  }, [participant, source, trackPub, trackPub?.track, trackPub?.isSubscribed])

  // Don't render a screen share tile if it's not enabled
  if (source === 'screen_share' && !videoEnabled) return null

  return (
    <div className={`relative bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex items-center justify-center shadow-lg group ${isPinned ? 'w-full h-full' : 'w-full aspect-video'}`}>
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        className={`w-full h-full ${source === 'screen_share' || isPinned ? 'object-contain bg-black' : 'object-cover'}`} 
      />
      
      {!videoEnabled && (
        <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center gap-2 z-10 select-none">
          {source === 'camera' ? (
            <>
              <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-bold uppercase border border-primary/20">
                {getDisplayName(participant.identity).slice(0, 2).toUpperCase()}
              </div>
              <span className="text-xs text-foreground/50">Camera Off</span>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 text-slate-500">
              <MonitorUp className="h-10 w-10 animate-pulse" />
              <span className="text-xs">Loading screen share...</span>
            </div>
          )}
        </div>
      )}

      {!participant.isLocal && source === 'camera' && <audio ref={audioRef} autoPlay />}
      
      {/* Overlay Information */}
      <div className="absolute bottom-3 left-3 bg-black/60 px-3 py-1 rounded-md text-xs font-semibold backdrop-blur-xs flex flex-col gap-0.5 text-white z-10">
        <div className="flex items-center gap-1.5">
          <span>{getDisplayName(participant.identity)}</span>
          {participant.isLocal && <span className="text-[10px] uppercase font-bold text-primary">(You)</span>}
          {source === 'screen_share' && <span className="text-[10px] uppercase font-bold text-blue-400 border border-blue-400/50 px-1 rounded">Screen</span>}
          {audioMuted && source === 'camera' && <MicOff className="h-3 w-3 text-red-500 ml-1" />}
        </div>
        {/* Diagnostic info to show subscription state */}
        {source === 'screen_share' && (
          <span className="text-[8px] text-gray-400 font-mono tracking-tighter leading-none mt-0.5">
            pub:{trackPub ? 'Y' : 'N'} | sub:{trackPub?.isSubscribed ? 'Y' : 'N'} | trk:{trackPub?.track ? 'Y' : 'N'} | en:{videoEnabled ? 'Y' : 'N'}
          </span>
        )}
      </div>

      {/* Pin Button */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <Button size="icon" variant="secondary" className="h-8 w-8 bg-black/60 hover:bg-black/80 text-white border-none backdrop-blur-xs" onClick={onTogglePin}>
          {isPinned ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  )
}

export default function RoomPage({ params }: RoomPageProps) {
  const unwrappedParams = use(params)
  const roomId = unwrappedParams.roomId

  const { user, loadProfile } = useAuth()
  
  // Lobby States
  const [hasJoined, setHasJoined] = useState(false)
  const [lobbyName, setLobbyName] = useState('')
  const [previewVideoTrack, setPreviewVideoTrack] = useState<LocalVideoTrack | null>(null)
  const previewVideoRef = useRef<HTMLVideoElement>(null)
  
  // Room States
  const [token, setToken] = useState<string | null>(null)
  const [room, setRoom] = useState<Room | null>(null)
  const [participants, setParticipants] = useState<any[]>([])
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [statusText, setStatusText] = useState('')
  const [meetingHostId, setMeetingHostId] = useState<string | null>(null)
  const [shareError, setShareError] = useState<string | null>(null)
  const [serverUrl, setServerUrl] = useState<string | null>(null)
  // Captions state
  const [showCaptions, setShowCaptions] = useState(true)
  const [activeCaption, setActiveCaption] = useState<{ participantId: string; text: string } | null>(null)
  const showCaptionTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const displayCaption = (participantId: string, text: string) => {
    setActiveCaption({ participantId, text })
    if (showCaptionTimeoutRef.current) {
      clearTimeout(showCaptionTimeoutRef.current)
    }
    showCaptionTimeoutRef.current = setTimeout(() => {
      setActiveCaption(null)
    }, 5000)
  }

  // Layout States
  const [pinnedId, setPinnedId] = useState<string | null>(null) // Format: "sid:source" e.g., "p_123:camera"

  // Sidebar States
  const [activeSidebar, setActiveSidebar] = useState<'chat' | 'participants' | null>(null)
  const [messages, setMessages] = useState<{sender: string, text: string, time: Date}[]>([])
  const [messageInput, setMessageInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  // Initialize Lobby & Fetch Meeting Metadata
  useEffect(() => {
    if (hasJoined) return

    const initLobby = async () => {
      let identity = ''
      const storedJoinName = localStorage.getItem('joinName')
      if (storedJoinName) {
        identity = storedJoinName
      } else {
        await loadProfile()
        const activeUser = useAuth.getState().user
        if (activeUser) identity = activeUser.name
      }
      setLobbyName(identity)

      try {
        const meetingData = await meetingService.validateMeeting(roomId)
        setMeetingHostId(meetingData.host_id)
      } catch (e) { console.error('Meeting not found', e) }

      try {
        const history = await meetingService.fetchMessages(roomId)
        setMessages(history.map((m: any) => ({ sender: m.sender_name, text: m.message, time: new Date(m.created_at) })))
      } catch (e) { console.error('No message history', e) }

      try {
        const track = await createLocalVideoTrack()
        setPreviewVideoTrack(track)
        if (previewVideoRef.current) {
          previewVideoRef.current.muted = true
          previewVideoRef.current.playsInline = true
          track.attach(previewVideoRef.current)
          previewVideoRef.current.play().catch(() => {})
        }
      } catch (err) {
        setIsVideoOff(true)
      }
    }
    initLobby()

    return () => {
      if (previewVideoTrack) {
        previewVideoTrack.stop()
        previewVideoTrack.detach()
      }
    }
  }, [hasJoined, roomId])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleJoinClick = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!lobbyName.trim()) return

    localStorage.setItem('joinName', lobbyName.trim())
    
    if (previewVideoTrack) {
      previewVideoTrack.stop()
      previewVideoTrack.detach()
    }

    setHasJoined(true)
    setStatusText('Requesting room token...')

    try {
      const uniqueIdentity = `${lobbyName.trim()}_${Math.random().toString(36).substring(2, 7)}`
      const data = await livekitService.getRoomToken(roomId.toUpperCase(), uniqueIdentity)
      setToken(data.token)
      setServerUrl(data.serverUrl)
    } catch (err) {
      setStatusText('Failed to obtain room token.')
    }
  }

  // Auto-pin screen shares
  useEffect(() => {
    if (!room) return
    let screenShareId: string | null = null
    
    participants.forEach(p => {
      const hasScreen = Array.from(p.trackPublications.values()).some((pub: any) => pub.source === 'screen_share')
      if (hasScreen) {
        screenShareId = `${p.sid || p.identity}:screen_share`
      }
    })

    if (screenShareId && !pinnedId) {
      setPinnedId(screenShareId)
    } else if (!screenShareId && pinnedId?.endsWith(':screen_share')) {
      setPinnedId(null)
    }
  }, [participants, pinnedId, room])

  useEffect(() => {
    if (!token || !hasJoined) return

    setStatusText('Connecting to video server...')
    const activeRoom = new Room({
      adaptiveStream: false,
      dynacast: false,
      publishDefaults: {
        videoCodec: 'vp8'
      }
    })

    const updateParticipantList = () => {
      setParticipants([
        activeRoom.localParticipant,
        ...Array.from(activeRoom.remoteParticipants.values())
      ])
    }

    activeRoom.on(RoomEvent.Connected, () => setStatusText(''))
    activeRoom.on(RoomEvent.ParticipantConnected, updateParticipantList)
    activeRoom.on(RoomEvent.ParticipantDisconnected, updateParticipantList)
    activeRoom.on(RoomEvent.TrackSubscribed, updateParticipantList)
    activeRoom.on(RoomEvent.TrackUnsubscribed, updateParticipantList)
    activeRoom.on(RoomEvent.LocalTrackPublished, updateParticipantList)
    activeRoom.on(RoomEvent.LocalTrackUnpublished, updateParticipantList)

    activeRoom.on(RoomEvent.DataReceived, (payload, participant) => {
      const strData = new TextDecoder().decode(payload)
      try {
        const parsed = JSON.parse(strData)
        if (parsed.type === 'END_MEETING') {
          activeRoom.disconnect()
          alert('The host has ended the meeting.')
          window.location.href = '/dashboard'
          return
        }
        if (parsed.type === 'CAPTION') {
          displayCaption(parsed.sender || participant?.identity || 'Unknown', parsed.text)
          return
        }
        setMessages(prev => [...prev, { sender: parsed.sender || participant?.identity || 'Unknown', text: parsed.text, time: new Date() }])
      } catch(e) {}
    })

    // Register transcription text stream handler
    activeRoom.registerTextStreamHandler('lk.transcription', async (reader, participant) => {
      for await (const raw of reader) {
        displayCaption(participant.identity, raw)
      }
    })

    const connectToRoom = async () => {
      try {
        const wsUrl = serverUrl || process.env.NEXT_PUBLIC_LIVEKIT_URL || 'ws://localhost:7800'
        await activeRoom.connect(wsUrl, token)
        setRoom(activeRoom)
        updateParticipantList()

        try {
          await activeRoom.localParticipant.enableCameraAndMicrophone()
          if (isVideoOff) await activeRoom.localParticipant.setCameraEnabled(false)
          if (isMuted) await activeRoom.localParticipant.setMicrophoneEnabled(false)
        } catch (deviceErr) {
          try { await activeRoom.localParticipant.setMicrophoneEnabled(!isMuted) } catch (e) {}
        }
      } catch (err) {
        setStatusText('Failed to connect to the video session.')
      }
    }
    connectToRoom()

    return () => {
      // Cleanup: unregister handler if available
      if (activeRoom.unregisterTextStreamHandler) {
        activeRoom.unregisterTextStreamHandler('lk.transcription')
      }
      activeRoom.disconnect()
    }
  }, [token, hasJoined, serverUrl])

  // Client-side speech recognition for captions
  useEffect(() => {
    if (!room || isMuted || !hasJoined) return

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) return

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = async (event: any) => {
      let finalTranscript = ''
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript
        }
      }

      if (finalTranscript.trim()) {
        const payload = JSON.stringify({ type: 'CAPTION', text: finalTranscript.trim(), sender: lobbyName })
        const data = new TextEncoder().encode(payload)
        try {
          await room.localParticipant.publishData(data, { reliable: true })
        } catch (e) {
          console.error('Failed to broadcast caption', e)
        }
        displayCaption(lobbyName, finalTranscript.trim())
      }
    }

    recognition.onerror = (event: any) => {
      console.warn('Speech recognition error/warning', event.error)
    }

    try {
      recognition.start()
    } catch (e) {
      console.error('Failed to start speech recognition', e)
    }

    return () => {
      try {
        recognition.stop()
      } catch (e) {}
    }
  }, [room, isMuted, hasJoined, lobbyName])

  const handleMuteToggle = async () => {
    if (!room) { setIsMuted(!isMuted); return }
    try {
      await room.localParticipant.setMicrophoneEnabled(isMuted)
      setIsMuted(!isMuted)
    } catch (e) {}
  }

  const handleVideoToggle = async () => {
    if (!room) {
      setIsVideoOff(!isVideoOff)
      if (!isVideoOff && previewVideoTrack) {
        previewVideoTrack.stop()
        setPreviewVideoTrack(null)
      } else if (isVideoOff) {
        try {
          const track = await createLocalVideoTrack()
          setPreviewVideoTrack(track)
          if (previewVideoRef.current) track.attach(previewVideoRef.current)
        } catch(e) {}
      }
      return
    }
    try {
      await room.localParticipant.setCameraEnabled(isVideoOff)
      setIsVideoOff(!isVideoOff)
    } catch (e) {}
  }

  const handleScreenShareToggle = async () => {
    if (!room) return
    try {
      await room.localParticipant.setScreenShareEnabled(!isScreenSharing)
      setIsScreenSharing(!isScreenSharing)
      setShareError(null)
      if (!isScreenSharing) {
        setPinnedId(`${room.localParticipant.sid || room.localParticipant.identity}:screen_share`)
      } else {
        setPinnedId(null)
      }
    } catch (e: any) {
      console.error('Failed to share screen', e)
      setShareError(e.message ?? 'Unable to start screen share. Ensure the site is served over HTTPS and you have granted permission.')
    }
  }

  const handleLeaveCall = async () => {
    if (room) room.disconnect()
    window.location.href = '/dashboard'
  }

  const handleEndMeetingForAll = async () => {
    if (!room) return
    
    // Broadcast end message to everyone in the room
    const payload = JSON.stringify({ type: 'END_MEETING' })
    const data = new TextEncoder().encode(payload)
    try {
      await room.localParticipant.publishData(data, { reliable: true })
    } catch (e) {}

    if (user && user.id === meetingHostId) {
      try { await meetingService.endMeeting(roomId, 60) } catch(e) {}
    }
    room.disconnect()
    window.location.href = '/dashboard'
  }

  const sendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!messageInput.trim() || !room) return

    const payload = JSON.stringify({ text: messageInput, sender: lobbyName })
    const data = new TextEncoder().encode(payload)
    
    try {
      await room.localParticipant.publishData(data, { reliable: true })
      setMessages(prev => [...prev, { sender: lobbyName, text: messageInput, time: new Date() }])
      await meetingService.sendMessage(roomId, messageInput)
      setMessageInput('')
    } catch (e) { console.error('Failed to send msg', e) }
  }

  const kickParticipant = (identity: string) => {
    alert(`Host control: Disconnecting ${identity} (API not fully implemented in MVP)`)
  }

  // Create flat list of all active tiles (Camera and Screen Shares are separate tiles now)
  const activeTiles: { participant: any, source: 'camera' | 'screen_share', id: string, trackPub: any }[] = []
  participants.forEach(p => {
    const pid = p.sid || p.identity
    const cameraPub = Array.from(p.trackPublications.values()).find(
      (pub: any) => pub.source === 'camera' || (pub.kind === 'video' && pub.source !== 'screen_share')
    )
    activeTiles.push({ participant: p, source: 'camera', id: `${pid}:camera`, trackPub: cameraPub })
    
    const screenPub = Array.from(p.trackPublications.values()).find(
      (pub: any) => pub.source === 'screen_share'
    )
    if (screenPub) {
      activeTiles.push({ participant: p, source: 'screen_share', id: `${pid}:screen_share`, trackPub: screenPub })
    }
  })

  const pinnedTile = activeTiles.find(t => t.id === pinnedId)
  const unpinnedTiles = activeTiles.filter(t => t.id !== pinnedId)

  // --- Render Pre-Join Lobby ---
  if (!hasJoined) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white">
        <h1 className="text-3xl font-bold mb-8">Ready to join?</h1>
        <div className="flex flex-col md:flex-row gap-8 items-center w-full max-w-full sm:max-w-4xl">
          <div className="flex-1 w-full bg-slate-900 rounded-2xl overflow-hidden aspect-video relative border border-slate-800 flex items-center justify-center shadow-2xl max-w-full">
            <video ref={previewVideoRef} autoPlay playsInline muted className={`w-full h-full object-cover transform scale-x-[-1] ${isVideoOff ? 'hidden' : ''}`} />
            
            {isVideoOff && (
              <div className="flex flex-col items-center text-slate-500">
                <VideoOff className="h-12 w-12 mb-2" />
                <span>Camera is off</span>
              </div>
            )}
            
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
              <Button onClick={handleMuteToggle} size="icon" className={`h-10 w-10 sm:h-12 sm:w-12 rounded-full border-none ${isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-slate-800/80 hover:bg-slate-700 backdrop-blur-sm'}`}>
                {isMuted ? <MicOff className="h-5 w-5 text-white" /> : <Mic className="h-5 w-5 text-white" />}
              </Button>
              <Button onClick={handleVideoToggle} size="icon" className={`h-10 w-10 sm:h-12 sm:w-12 rounded-full border-none ${isVideoOff ? 'bg-red-500 hover:bg-red-600' : 'bg-slate-800/80 hover:bg-slate-700 backdrop-blur-sm'}`}>
                {isVideoOff ? <VideoOff className="h-5 w-5 text-white" /> : <Video className="h-5 w-5 text-white" />}
              </Button>
            </div>
          </div>

          <div className="w-full md:w-80 bg-slate-900/50 p-6 rounded-2xl border border-slate-800 backdrop-blur-sm">
            <h2 className="text-xl font-bold mb-4">Meeting: <span className="text-primary tracking-widest uppercase font-mono">{roomId}</span></h2>
            <form onSubmit={handleJoinClick} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Display Name</label>
                <Input value={lobbyName} onChange={(e) => setLobbyName(e.target.value)} required className="bg-slate-800 border-slate-700 text-white" />
              </div>
              <Button type="submit" size="lg" className="w-full font-bold text-md h-12">Join Now</Button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  // --- Render Meeting Room ---
  return (
    <div className="relative h-[100dvh] bg-background text-foreground flex flex-col justify-between overflow-hidden">
      {/* Header */}
      <header className="px-4 sm:px-6 py-3 bg-primary flex items-center justify-between z-10 shrink-0 shadow-lg shadow-primary/25" style={{borderBottom: '2px solid rgba(147,210,255,0.55)'}}>
        <div className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-full bg-white/20 border border-white/30 flex items-center justify-center">
            <Video className="h-4 w-4 text-white" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-extrabold text-sm text-white tracking-tight">Codovate-Meet</span>
            <span className="font-mono text-[10px] font-bold tracking-widest text-blue-200/70">{roomId}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setActiveSidebar(activeSidebar === 'participants' ? null : 'participants')} className={`border-white/20 bg-white/10 hover:bg-white/20 text-white font-semibold transition-colors ${activeSidebar === 'participants' ? 'bg-white/25 border-white/40' : ''}`}>
            <Users className="h-4 w-4 mr-2" /> {participants.length}
          </Button>
          <Button variant="outline" onClick={() => setActiveSidebar(activeSidebar === 'chat' ? null : 'chat')} className={`border-white/20 bg-white/10 hover:bg-white/20 text-white font-semibold transition-colors ${activeSidebar === 'chat' ? 'bg-white/25 border-white/40' : ''}`}>
            <MessageSquare className="h-4 w-4 mr-2" /> Chat
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Video Grid */}
        <main className="flex-1 flex flex-col p-4 overflow-hidden relative bg-slate-950">
          {statusText ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <p className="text-sm text-foreground/60 font-medium italic">{statusText}</p>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col gap-4">
              {pinnedTile ? (
                // Spotlight Layout
                <>
                  <div className="flex-1 w-full rounded-xl overflow-hidden min-h-0 bg-black">
                    <VideoTile 
                      participant={pinnedTile.participant} 
                      source={pinnedTile.source} 
                      isPinned={true} 
                      onTogglePin={() => setPinnedId(null)} 
                      trackPub={pinnedTile.trackPub}
                    />
                  </div>
                  {unpinnedTiles.length > 0 && (
                    <div className="h-32 sm:h-40 shrink-0 flex gap-4 overflow-x-auto pb-2 px-2 snap-x">
                      {unpinnedTiles.map(tile => (
                        <div key={tile.id} className="h-full aspect-video shrink-0 snap-start">
                          <VideoTile 
                            participant={tile.participant} 
                            source={tile.source} 
                            isPinned={false} 
                            onTogglePin={() => setPinnedId(tile.id)} 
                            trackPub={tile.trackPub}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                // Standard Grid Layout
                <div className={`grid gap-4 w-full h-full content-center overflow-y-auto ${
                  activeTiles.length <= 1 ? 'grid-cols-1 max-w-4xl mx-auto' :
                  activeTiles.length === 2 ? 'grid-cols-1 sm:grid-cols-2 max-w-6xl mx-auto' :
                  'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-7xl mx-auto'
                }`}>
                  {activeTiles.map(tile => (
                    <VideoTile 
                      key={tile.id}
                      participant={tile.participant} 
                      source={tile.source} 
                      isPinned={false} 
                      onTogglePin={() => setPinnedId(tile.id)} 
                      trackPub={tile.trackPub}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
          </main>

          {/* Floating Captions Overlay */}
          {showCaptions && activeCaption && (
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-[90%] max-w-xl bg-black/75 backdrop-blur-md text-white p-3 rounded-xl z-20 text-center pointer-events-none shadow-lg border border-white/10 select-none animate-in fade-in zoom-in-95 duration-200">
              <p className="text-xs text-primary/80 font-bold mb-0.5 uppercase tracking-wide">
                {activeCaption.participantId}
              </p>
              <p className="text-sm font-medium">
                {activeCaption.text}
              </p>
            </div>
          )}

          {/* Sidebar Panel */}
        {activeSidebar && (
          <aside className="w-80 bg-card border-l border-border flex flex-col shrink-0 animate-in slide-in-from-right-8 duration-200">
            <div className="p-4 border-b border-border flex justify-between items-center">
              <h2 className="font-bold text-lg text-foreground">{activeSidebar === 'chat' ? 'In-Call Messages' : 'Participants'}</h2>
              <Button variant="ghost" size="icon" onClick={() => setActiveSidebar(null)} className="hover:bg-secondary text-foreground">
                <X className="h-4 w-4" />
              </Button>
            </div>

            {activeSidebar === 'chat' && (
              <>
                <ScrollArea className="flex-1 p-4">
                  <div ref={scrollRef} className="space-y-4">
                    {messages.length === 0 && <p className="text-center text-muted-foreground text-sm mt-4">No messages yet. Say hi! 👋</p>}
                    {messages.map((msg, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex items-baseline gap-2">
                          <span className="font-bold text-sm text-primary">{msg.sender}</span>
                          <span className="text-[10px] text-muted-foreground">{msg.time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                        <p className="text-sm bg-secondary inline-block px-3 py-2 rounded-lg text-foreground border border-border">{msg.text}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <div className="p-4 border-t border-border">
                  <form onSubmit={sendChatMessage} className="flex gap-2">
                    <Input placeholder="Type a message..." value={messageInput} onChange={(e) => setMessageInput(e.target.value)} className="bg-background border-border" />
                    <Button type="submit" disabled={!messageInput.trim()} className="bg-primary text-primary-foreground hover:opacity-90">Send</Button>
                  </form>
                </div>
              </>
            )}

            {activeSidebar === 'participants' && (
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-2">
                  {participants.map(p => {
                    const isHost = user && getDisplayName(p.identity) === user.name && user.id === meetingHostId
                    return (
                      <div key={p.sid || p.identity} className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/50 border border-border">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase border border-primary/20">
                            {getDisplayName(p.identity).slice(0, 2)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold flex items-center gap-2 text-foreground">
                              {getDisplayName(p.identity)} {p.isLocal && <span className="text-[10px] text-muted-foreground">(You)</span>}
                              {isHost && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20 font-bold">Host</span>}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {user && user.id === meetingHostId && !p.isLocal && (
                            <Button variant="ghost" size="icon" onClick={() => kickParticipant(p.identity)} className="h-6 w-6 hover:bg-destructive/10 text-destructive" title="Remove Participant">
                              <ShieldAlert className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            )}
          </aside>
        )}
      </div>

      {/* Footer Controls */}
      <footer className="px-4 py-3 bg-card border-t border-border flex items-center justify-center gap-2 sm:gap-4 shrink-0 shadow-sm">
        <Button size="icon" onClick={handleMuteToggle} className={`h-10 w-10 sm:h-12 sm:w-12 rounded-full border transition-all ${isMuted ? 'bg-red-500 hover:bg-red-600 border-red-500 text-white' : 'bg-secondary hover:bg-secondary/80 border-border text-foreground'}`} disabled={!room}>
          {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </Button>

        <Button size="icon" onClick={handleVideoToggle} className={`h-10 w-10 sm:h-12 sm:w-12 rounded-full border transition-all ${isVideoOff ? 'bg-red-500 hover:bg-red-600 border-red-500 text-white' : 'bg-secondary hover:bg-secondary/80 border-border text-foreground'}`} disabled={!room}>
          {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
        </Button>

        <Button size="icon" onClick={handleScreenShareToggle} className={`h-10 w-10 sm:h-12 sm:w-12 rounded-full border transition-all hidden sm:inline-flex ${isScreenSharing ? 'bg-primary hover:opacity-90 border-primary text-white' : 'bg-secondary hover:bg-secondary/80 border-border text-foreground'}`} disabled={!room}>
          <MonitorUp className="h-5 w-5" />
        </Button>
        {/* Captions toggle */}
        <Button size="icon" onClick={() => setShowCaptions(!showCaptions)} className={`h-10 w-10 sm:h-12 sm:w-12 rounded-full border transition-all ${showCaptions ? 'bg-primary text-white' : 'bg-secondary text-foreground'}`} title="Toggle Captions">
          <Subtitles className="h-5 w-5" />
        </Button>

        {user && user.id === meetingHostId ? (
          <div className="flex gap-2 ml-2 sm:ml-4">
            <Button onClick={handleLeaveCall} variant="outline" className="h-10 sm:h-12 px-3 sm:px-6 rounded-full border-slate-700 hover:bg-slate-800 font-semibold text-sm sm:text-md">
              Leave
            </Button>
            <Button onClick={handleEndMeetingForAll} className="h-10 sm:h-12 px-3 sm:px-6 rounded-full bg-red-600 hover:bg-red-700 font-semibold text-sm sm:text-md">
              <PhoneOff className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" /> <span className="hidden sm:inline">End Meeting</span><span className="sm:hidden">End</span>
            </Button>
          </div>
        ) : (
          <Button onClick={handleLeaveCall} className="h-10 sm:h-12 px-4 sm:px-6 rounded-full bg-red-600 hover:bg-red-700 ml-2 sm:ml-4 font-semibold text-sm sm:text-md">
            <PhoneOff className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" /> Leave
          </Button>
        )}
      </footer>
      {shareError && (
        <div className="bg-destructive/10 border border-destructive text-destructive p-3 rounded-lg mx-6 mt-4 text-sm">
          ⚠️ {shareError}
        </div>
      )}
    </div>
  )
}
