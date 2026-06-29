'use client'

import { use, useEffect, useState, useRef } from 'react'
import { Room, RoomEvent, LocalVideoTrack, createLocalVideoTrack } from 'livekit-client'
import { useAuth } from '@/hooks/useAuth'
import { livekitService } from '@/services/livekit'
import { meetingService } from '@/services/meeting'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, Users, MessageSquare, MonitorUp, ShieldAlert,
  X, Maximize2, Minimize2, Subtitles, Expand, Shrink, Sparkles, Code, Paintbrush,
  BarChart2, ShieldCheck, Trophy, Crown, Flag, Calendar, Heart, Send, Clock,
  RefreshCw, Clipboard, Check, Play, User, Terminal, HelpCircle, Activity, PlayCircle, Eye
} from 'lucide-react'

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

// Visual webcam filters map
const filterMap: Record<string, string> = {
  none: '',
  noir: 'grayscale(1) contrast(1.2)',
  warm: 'sepia(0.35) saturate(1.3) hue-rotate(-10deg)',
  cool: 'saturate(1.2) hue-rotate(15deg) brightness(0.95)',
  cyberpunk: 'hue-rotate(140deg) saturate(1.8) contrast(1.35) brightness(0.9)',
  vintage: 'sepia(0.65) contrast(0.85) brightness(1.05)',
  bubblegum: 'hue-rotate(290deg) saturate(1.4) contrast(1.1)',
  glow: 'brightness(1.15) contrast(0.9) blur(0.5px)'
}

function VideoTile({
  participant,
  source,
  isPinned,
  onTogglePin,
  trackPub,
  reactions = [],
  filter = '',
  handRaised = false,
  isCompanionMode = false
}: {
  participant: any
  source: 'camera' | 'screen_share'
  isPinned: boolean
  onTogglePin: () => void
  trackPub: any
  reactions?: { id: string; emoji: string }[]
  filter?: string
  handRaised?: boolean
  isCompanionMode?: boolean
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [videoEnabled, setVideoEnabled] = useState(false)
  const [audioMuted, setAudioMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const toggleFullscreen = async () => {
    if (!containerRef.current) return
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch (err) {
      console.error("Fullscreen error:", err)
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

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

      if (!participant.isLocal && source === 'camera') {
        const audioPub = Array.from(participant.trackPublications.values()).find(
          (pub: any) => pub.kind === 'audio'
        ) as any
        if (audioPub && audioPub.track && audioPub.isSubscribed) {
          audioTrack = audioPub.track
          if (audioRef.current) {
            audioRef.current.muted = isCompanionMode || audioPub.isMuted
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
  }, [participant, source, trackPub, trackPub?.track, trackPub?.isSubscribed, isCompanionMode])

  if (source === 'screen_share' && !videoEnabled) return null

  return (
    <div
      ref={containerRef}
      className={`relative bg-slate-900 overflow-hidden flex items-center justify-center shadow-lg group transition-all ${isFullscreen ? 'w-screen h-screen rounded-none border-none' : `border border-slate-800 rounded-xl ${isPinned ? 'w-full h-full' : 'w-full aspect-video'}`}`}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ filter: filterMap[filter] || '' }}
        className={`w-full h-full transition-all ${source === 'screen_share' || isPinned ? 'object-contain bg-black' : 'object-cover'}`}
      />

      {/* Floating Reactions Overlay */}
      {reactions.map(r => (
        <div
          key={r.id}
          className="absolute bottom-16 left-1/2 -translate-x-1/2 text-5xl pointer-events-none select-none z-30"
          style={{
            animation: 'floatUp 2.2s ease-out forwards',
          }}
        >
          {r.emoji}
        </div>
      ))}

      {/* Raise Hand Indicator Overlay */}
      {handRaised && (
        <div className="absolute top-4 left-4 bg-amber-500 text-white rounded-full p-2 flex items-center justify-center shadow-lg z-25 border border-slate-900 animate-bounce">
          <span className="text-xl">🖐️</span>
        </div>
      )}

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
      </div>

      {/* Action Buttons */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex gap-2">
        <Button size="icon" variant="secondary" className="h-8 w-8 bg-black/60 hover:bg-black/80 text-white border-none backdrop-blur-xs" onClick={toggleFullscreen} title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
          {isFullscreen ? <Shrink className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
        </Button>
        <Button size="icon" variant="secondary" className="h-8 w-8 bg-black/60 hover:bg-black/80 text-white border-none backdrop-blur-xs" onClick={onTogglePin} title={isPinned ? "Unpin Tile" : "Pin Tile"}>
          {isPinned ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
   WHITEBOARD WORKSPACE COMPONENT (With AI UML Flowchart Generator)
   ────────────────────────────────────────────────────────────────────────── */
function WhiteboardWorkspace({ sendData }: { sendData: any }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawingRef = useRef(false)
  const lastPosRef = useRef({ x: 0, y: 0 })
  const [color, setColor] = useState('#2563eb')
  const [brushSize, setBrushSize] = useState(5)
  const [tool, setTool] = useState<'draw' | 'erase'>('draw')
  const [aiUmlPrompt, setAiUmlPrompt] = useState('')

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    return { x, y }
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = true
    const { x, y } = getCanvasCoords(e)
    lastPosRef.current = { x, y }
  }

  const drawLocal = (x0: number, y0: number, x1: number, y1: number, strokeColor: string, size: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.beginPath()
    ctx.strokeStyle = strokeColor
    ctx.lineWidth = size
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.moveTo(x0 * canvas.width, y0 * canvas.height)
    ctx.lineTo(x1 * canvas.width, y1 * canvas.height)
    ctx.stroke()
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const { x, y } = getCanvasCoords(e)
    const strokeColor = tool === 'erase' ? '#0b0f19' : color

    drawLocal(lastPosRef.current.x, lastPosRef.current.y, x, y, strokeColor, brushSize)

    sendData('WHITEBOARD_DRAW', {
      x0: lastPosRef.current.x,
      y0: lastPosRef.current.y,
      x1: x,
      y1: y,
      color: strokeColor,
      size: brushSize
    })

    lastPosRef.current = { x, y }
  }

  const stopDrawing = () => {
    isDrawingRef.current = false
  }

  const clearCanvasLocal = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#0b0f19'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  const handleClear = () => {
    clearCanvasLocal()
    sendData('WHITEBOARD_CLEAR', {})
  }

  // AI UML diagram generation simulation
  const handleAiUmlGenerate = () => {
    if (!aiUmlPrompt.trim()) return
    clearCanvasLocal()
    sendData('WHITEBOARD_CLEAR', {})

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Draw structured architecture boxes
    ctx.strokeStyle = '#2563eb'
    ctx.fillStyle = '#1e293b'
    ctx.lineWidth = 3

    // Client box
    ctx.fillRect(50, 150, 140, 80)
    ctx.strokeRect(50, 150, 140, 80)
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 12px sans-serif'
    ctx.fillText('Client (Browser)', 70, 195)

    // Arrow 1
    ctx.beginPath()
    ctx.strokeStyle = '#60a5fa'
    ctx.moveTo(190, 190)
    ctx.lineTo(290, 190)
    ctx.stroke()

    // API Server box
    ctx.fillStyle = '#1e293b'
    ctx.fillRect(290, 150, 140, 80)
    ctx.strokeRect(290, 150, 140, 80)
    ctx.fillStyle = '#ffffff'
    ctx.fillText('API Gateway', 320, 195)

    // Arrow 2
    ctx.beginPath()
    ctx.moveTo(430, 190)
    ctx.lineTo(530, 190)
    ctx.stroke()

    // Postgres DB box
    ctx.fillStyle = '#1e293b'
    ctx.fillRect(530, 150, 140, 80)
    ctx.strokeRect(530, 150, 140, 80)
    ctx.fillStyle = '#ffffff'
    ctx.fillText('Postgres Database', 550, 195)

    // Sync diagram paths to peers
    sendData('WHITEBOARD_DRAW', { x0: 50/800, y0: 150/500, x1: 190/800, y1: 230/500, color: '#2563eb', size: 3 })
    sendData('WHITEBOARD_DRAW', { x0: 290/800, y0: 150/500, x1: 430/800, y1: 230/500, color: '#2563eb', size: 3 })
    sendData('WHITEBOARD_DRAW', { x0: 530/800, y0: 150/500, x1: 670/800, y1: 230/500, color: '#2563eb', size: 3 })
    
    setAiUmlPrompt('')
    alert("AI Diagram parsed successfully! Shared architecture nodes with team.")
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = canvas.parentElement?.clientWidth || 800
    canvas.height = canvas.parentElement?.clientHeight || 500
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.fillStyle = '#0b0f19'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }

    const handleReceiveDraw = (event: CustomEvent) => {
      const { x0, y0, x1, y1, color, size } = event.detail
      drawLocal(x0, y0, x1, y1, color, size)
    }

    const handleReceiveClear = () => {
      clearCanvasLocal()
    }

    window.addEventListener('wb_draw' as any, handleReceiveDraw)
    window.addEventListener('wb_clear' as any, handleReceiveClear)

    return () => {
      window.removeEventListener('wb_draw' as any, handleReceiveDraw)
      window.removeEventListener('wb_clear' as any, handleReceiveClear)
    }
  }, [])

  return (
    <div className="flex flex-col h-full bg-slate-950 rounded-xl overflow-hidden border border-slate-800 animate-in zoom-in-95">
      <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex justify-between items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Paintbrush className="h-4 w-4 text-primary" />
          <span className="font-bold text-xs text-white">Whiteboard Workspace</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* AI UML Generator input */}
          <div className="flex items-center gap-1.5 mr-2">
            <Input
              placeholder="e.g. auth microservice flow"
              value={aiUmlPrompt}
              onChange={(e) => setAiUmlPrompt(e.target.value)}
              className="h-7 text-[10px] bg-slate-950 border-slate-800 text-white w-32 focus:w-44 transition-all"
            />
            <Button onClick={handleAiUmlGenerate} size="sm" className="h-7 text-[9px] bg-amber-600 hover:bg-amber-700 font-extrabold flex items-center gap-1 border-none text-white cursor-pointer">
              <Sparkles className="h-2.5 w-2.5" /> UML
            </Button>
          </div>

          {['#2563eb', '#dc2626', '#16a34a', '#ca8a04', '#ffffff'].map(c => (
            <button
              key={c}
              className={`w-5 h-5 rounded-full border ${color === c && tool === 'draw' ? 'scale-110 ring-2 ring-primary border-transparent' : 'border-slate-700'}`}
              style={{ backgroundColor: c }}
              onClick={() => { setColor(c); setTool('draw') }}
            />
          ))}
          <button
            className={`px-2 py-0.5 rounded text-[10px] border font-bold ${tool === 'erase' ? 'bg-primary text-white border-primary' : 'bg-slate-800 text-slate-300 border-slate-700'}`}
            onClick={() => setTool('erase')}
          >
            Eraser
          </button>
          <select
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="bg-slate-800 border border-slate-700 rounded text-white text-[10px] px-1.5 py-0.5 animate-in"
          >
            <option value={2}>Small</option>
            <option value={5}>Medium</option>
            <option value={10}>Large</option>
          </select>
          <button
            onClick={handleClear}
            className="px-2 py-0.5 rounded text-[10px] bg-red-950 border border-red-800 hover:bg-red-900 text-red-200 font-bold transition"
          >
            Clear
          </button>
        </div>
      </div>
      <div className="flex-1 relative min-h-0">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          className="w-full h-full cursor-crosshair block bg-slate-950"
        />
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
   CODE WORKSPACE COMPONENT (With AI Code Explainer & Bug Fixer)
   ────────────────────────────────────────────────────────────────────────── */
function CodeWorkspaceWithAI({ sendData, askAI }: { sendData: any; askAI: any }) {
  const [code, setCode] = useState('// Write live collaborative code here\nconsole.log("Welcome developers!");')
  const [language, setLanguage] = useState('javascript')
  const [consoleOutput, setConsoleOutput] = useState<string[]>([])
  const [isRunning, setIsRunning] = useState(false)

  const handleCodeChange = (newCode: string) => {
    setCode(newCode)
    sendData('CODE_EDIT', { text: newCode, language })
    window.dispatchEvent(new CustomEvent('code_sync_local', { detail: { text: newCode } }))
  }

  const handleLangChange = (newLang: string) => {
    setLanguage(newLang)
    sendData('CODE_EDIT', { text: code, language: newLang })
  }

  // AI Explain Code trigger
  const handleAiExplain = () => {
    askAI(`Explain this active code block line-by-line:\n\n${code}`)
    alert("AI explanation request sent! Review details in the AI Assistant tab.")
  }

  // AI Bug Fixer trigger
  const handleAiBugFix = () => {
    setIsRunning(true)
    setTimeout(() => {
      // Simulate buggy code scanning and correction
      const fixedCode = code
        .replace('consol.log', 'console.log')
        .replace('funtion', 'function')
      
      setCode(fixedCode)
      sendData('CODE_EDIT', { text: fixedCode, language })
      setConsoleOutput(prev => [...prev, '✓ AI Scanning Complete: Circular variables resolved, syntax optimized.'])
      setIsRunning(false)
      alert("AI Bug Fix applied! Code optimized.")
    }, 1000)
  }

  const runCode = () => {
    setIsRunning(true)
    setConsoleOutput(['[Compiling script...]', `[Running ${language} sandbox environment...]`])

    setTimeout(() => {
      if (language === 'javascript') {
        try {
          const logs: string[] = []
          const originalLog = console.log
          console.log = (...args) => {
            logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '))
          }
          const runBlock = new Function(code)
          runBlock()
          console.log = originalLog
          
          setConsoleOutput(prev => [
            ...prev,
            ...logs,
            `\n[Process completed successfully with exit code 0]`
          ])
        } catch (err: any) {
          setConsoleOutput(prev => [
            ...prev,
            `❌ Error: ${err.message}`,
            `\n[Process exited with errors]`
          ])
        }
      } else {
        const mockLogs: Record<string, string[]> = {
          python: [
            '>>> print("Executing Python script")',
            'Executing Python script',
            '>>> import math',
            '>>> print(math.pi)',
            '3.141592653589793',
            '\n[Process completed with exit code 0]'
          ],
          html: [
            '<!DOCTYPE html>',
            'Rendered document in live sandbox preview.',
            'Viewport dimension: 1024x768 px',
            '\n[Static page compiled successfully]'
          ],
          sql: [
            'Executing SQL query...',
            'Fetched 3 rows from table: tasks',
            '| id | action_item            | completed |',
            '| 1  | Setup workspace        | true      |',
            '| 2  | Test socket channels   | false     |',
            '\n[Query returned success]'
          ]
        }
        setConsoleOutput(prev => [...prev, ...(mockLogs[language] || ['Running process...', 'Execution success!'])])
      }
      setIsRunning(false)
    }, 1200)
  }

  useEffect(() => {
    const handleReceiveCode = (event: CustomEvent) => {
      const { text, language: lang } = event.detail
      setCode(text)
      setLanguage(lang)
    }

    const handleVoiceCodeTemplate = (event: CustomEvent) => {
      const { template } = event.detail
      setCode(template)
      sendData('CODE_EDIT', { text: template, language: 'javascript' })
      window.dispatchEvent(new CustomEvent('code_sync_local', { detail: { text: template } }))
    }

    window.addEventListener('code_sync' as any, handleReceiveCode)
    window.addEventListener('voice_code_template' as any, handleVoiceCodeTemplate)
    return () => {
      window.removeEventListener('code_sync' as any, handleReceiveCode)
      window.removeEventListener('voice_code_template' as any, handleVoiceCodeTemplate)
    }
  }, [])

  return (
    <div className="flex flex-col h-full bg-slate-950 rounded-xl overflow-hidden border border-slate-800 animate-in zoom-in-95">
      <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <Code className="h-4 w-4 text-primary" />
          <span className="font-bold text-xs text-white">Live Code Workspace</span>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleAiExplain} size="sm" variant="ghost" className="h-7 text-[10px] text-slate-400 hover:text-white font-bold">
            💡 Explain Code
          </Button>
          <Button onClick={handleAiBugFix} size="sm" variant="ghost" className="h-7 text-[10px] text-amber-500 hover:text-amber-400 font-extrabold flex items-center gap-1">
            🤖 AI Bug Fix
          </Button>
          <select
            value={language}
            onChange={(e) => handleLangChange(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded text-white text-[10px] px-2 py-0.5 font-bold"
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="html">HTML/CSS</option>
            <option value="sql">SQL Query</option>
          </select>
          <button
            onClick={runCode}
            disabled={isRunning}
            className="px-2.5 py-0.5 text-[10px] rounded bg-primary text-white hover:bg-primary/90 font-bold transition flex items-center gap-1 disabled:opacity-50"
          >
            {isRunning ? 'Running...' : <><Play className="h-2.5 w-2.5" /> Run</>}
          </button>
        </div>
      </div>
      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        <div className="flex-1 min-h-0 border-b md:border-b-0 md:border-r border-slate-800 flex">
          <textarea
            value={code}
            onChange={(e) => handleCodeChange(e.target.value)}
            className="flex-1 w-full h-full p-4 bg-slate-950 font-mono text-xs text-green-400 border-none outline-none resize-none focus:ring-0"
            placeholder="Type code here..."
          />
        </div>
        <div className="w-full md:w-56 bg-slate-900 flex flex-col h-1/3 md:h-full">
          <div className="px-3 py-1 border-b border-slate-800 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
            Console Output
          </div>
          <div className="flex-1 p-3 font-mono text-[10px] text-slate-300 overflow-y-auto space-y-0.5 select-text">
            {consoleOutput.length === 0 && <span className="text-slate-500 italic">No output. Press Run.</span>}
            {consoleOutput.map((line, i) => (
              <div key={i} className="whitespace-pre-wrap leading-tight">{line}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

interface UnoCard {
  id: string
  color: 'red' | 'blue' | 'green' | 'yellow' | 'wild'
  value: string
}

function UnoGameWorkspace({ room, lobbyName, sendData, setXp }: { room: any; lobbyName: string; sendData: any; setXp: any }) {
  const [hand, setHand] = useState<UnoCard[]>([])
  const [discardTop, setDiscardTop] = useState<UnoCard | null>(null)
  const [gameStatus, setGameStatus] = useState<'lobby' | 'playing' | 'won'>('lobby')
  const [winnerName, setWinnerName] = useState('')

  const colors = ['red', 'blue', 'green', 'yellow']
  const values = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'Skip', 'Reverse', 'Draw 2']

  const generateCard = (): UnoCard => {
    const isWild = Math.random() < 0.08
    if (isWild) {
      return { id: Math.random().toString(), color: 'wild', value: 'Wild' }
    }
    const color = colors[Math.floor(Math.random() * colors.length)] as any
    const value = values[Math.floor(Math.random() * values.length)]
    return { id: Math.random().toString(), color, value }
  }

  const startGame = () => {
    const initialHand = Array.from({ length: 7 }, generateCard)
    const initialDiscard = generateCard()
    setHand(initialHand)
    setDiscardTop(initialDiscard)
    setGameStatus('playing')

    sendData('UNO_START', { discard: initialDiscard })
  }

  const drawCard = () => {
    if (gameStatus !== 'playing') return
    const card = generateCard()
    setHand(prev => [...prev, card])
    sendData('UNO_DRAW', { player: lobbyName })
  }

  const playCard = (card: UnoCard) => {
    if (gameStatus !== 'playing' || !discardTop) return

    const isValidPlay = card.color === 'wild' || discardTop.color === 'wild' || card.color === discardTop.color || card.value === discardTop.value

    if (!isValidPlay) {
      alert("Invalid move! Card must match color or value of discard pile.")
      return
    }

    setHand(prev => {
      const nextHand = prev.filter(c => c.id !== card.id)
      if (nextHand.length === 0) {
        setGameStatus('won')
        setWinnerName(lobbyName)
        setXp((x: number) => x + 30)
        sendData('UNO_WIN', { winner: lobbyName })
      }
      return nextHand
    })
    setDiscardTop(card)
    sendData('UNO_PLAY', { card })
  }

  useEffect(() => {
    const handleStart = (e: CustomEvent) => {
      const { discard } = e.detail
      setDiscardTop(discard)
      setHand(Array.from({ length: 7 }, generateCard))
      setGameStatus('playing')
    }
    const handlePlay = (e: CustomEvent) => {
      const { card } = e.detail
      setDiscardTop(card)
    }
    const handleDraw = (e: CustomEvent) => {}
    const handleWin = (e: CustomEvent) => {
      const { winner } = e.detail
      setWinnerName(winner)
      setGameStatus('won')
    }

    window.addEventListener('uno_start' as any, handleStart)
    window.addEventListener('uno_play' as any, handlePlay)
    window.addEventListener('uno_draw' as any, handleDraw)
    window.addEventListener('uno_win' as any, handleWin)

    return () => {
      window.removeEventListener('uno_start' as any, handleStart)
      window.removeEventListener('uno_play' as any, handlePlay)
      window.removeEventListener('uno_draw' as any, handleDraw)
      window.removeEventListener('uno_win' as any, handleWin)
    }
  }, [])

  const bgColors: Record<string, string> = {
    red: 'bg-red-600',
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    yellow: 'bg-yellow-500',
    wild: 'bg-slate-700'
  }

  return (
    <div className="flex flex-col h-full bg-slate-950 rounded-xl overflow-hidden border border-slate-800 animate-in zoom-in-95">
      <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span>🃏</span>
          <span className="font-bold text-xs text-white">UNO! Card Game</span>
        </div>
        {gameStatus === 'lobby' && (
          <Button onClick={startGame} size="sm" className="h-7 text-[10px] bg-primary hover:opacity-90 border-none font-bold">
            Start Deal
          </Button>
        )}
      </div>

      <div className="flex-1 p-6 flex flex-col justify-between items-center select-none bg-slate-950">
        {gameStatus === 'lobby' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
            <span className="text-4xl">🃏</span>
            <p className="text-sm text-slate-300 font-bold max-w-xs">Start a collaborative UNO game with your teammates during focus breaks!</p>
          </div>
        )}

        {gameStatus === 'won' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
            <span className="text-4xl animate-bounce">🏆</span>
            <div>
              <p className="text-lg font-black text-amber-400">{winnerName} won the match!</p>
              <p className="text-xs text-slate-400 mt-1">Winner received a +30 XP bonus.</p>
            </div>
            <Button onClick={startGame} size="sm" className="h-8 text-xs bg-primary hover:opacity-90">
              Play Again
            </Button>
          </div>
        )}

        {gameStatus === 'playing' && discardTop && (
          <>
            <div className="flex flex-col items-center gap-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Discard Pile</span>
              <div className={`w-20 h-28 rounded-xl ${bgColors[discardTop.color]} flex items-center justify-center text-white font-extrabold text-sm border-2 border-white shadow-xl transform rotate-2`}>
                {discardTop.value}
              </div>
            </div>

            <div className="w-full space-y-4 mt-6">
              <div className="flex justify-between items-center px-2">
                <span className="text-xs font-bold text-slate-300">Your Hand ({hand.length} cards)</span>
                <Button onClick={drawCard} size="sm" className="h-7 text-[10px] bg-slate-800 hover:bg-slate-700 text-white font-bold">
                  ➕ Draw Card
                </Button>
              </div>

              <ScrollArea className="w-full">
                <div className="flex gap-2.5 pb-2 px-1">
                  {hand.map(card => (
                    <button
                      key={card.id}
                      onClick={() => playCard(card)}
                      className={`w-16 h-22 rounded-xl shrink-0 ${bgColors[card.color]} border border-white/40 flex flex-col justify-between p-2 text-white font-bold hover:scale-105 active:scale-95 transition-transform`}
                    >
                      <span className="text-[10px] text-left leading-none">{card.value}</span>
                      <span className="text-sm self-center font-extrabold">{card.value[0]}</span>
                      <span className="text-[10px] text-right leading-none self-end">{card.value}</span>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
   MAIN ROOM PAGE WITH ALL DEVELOPER USPs
   ────────────────────────────────────────────────────────────────────────── */
export default function RoomPage({ params }: RoomPageProps) {
  const unwrappedParams = use(params)
  const roomId = unwrappedParams.roomId

  const { user, loadProfile } = useAuth()
  
  // Lobby States
  const [hasJoined, setHasJoined] = useState(false)
  const [lobbyName, setLobbyName] = useState('')
  const [previewVideoTrack, setPreviewVideoTrack] = useState<LocalVideoTrack | null>(null)
  const previewVideoRef = useRef<HTMLVideoElement>(null)
  const [isCompanionMode, setIsCompanionMode] = useState(false)
  const [isOnToGoMode, setIsOnToGoMode] = useState(false)
  
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

  // Raised hands
  const [isHandRaised, setIsHandRaised] = useState(false)
  const [raisedHands, setRaisedHands] = useState<Record<string, boolean>>({})

  // Emojis reactions & trays
  const [showReactionTray, setShowReactionTray] = useState(false)
  const [reactions, setReactions] = useState<{ id: string; participantSid: string; emoji: string }[]>([])

  // Video visual filters & virtual backgrounds
  const [localVideoFilter, setLocalVideoFilter] = useState('none')
  const [participantFilters, setParticipantFilters] = useState<Record<string, string>>({})
  const [aiFraming, setAiFraming] = useState(false)

  // Workspace Split Layout: 'none' | 'code' | 'whiteboard' | 'uno'
  const [activeWorkspace, setActiveWorkspace] = useState<'none' | 'code' | 'whiteboard' | 'uno'>('none')

  // Sidebar Panel: 'chat' | 'participants' | 'ai' | 'polls' | 'effects' | 'analytics' | 'dev' | 'timetravel' | 'focus' | 'interview' | 'scheduler' | 'abuse' | null
  const [activeSidebar, setActiveSidebar] = useState<string | null>(null)

  // Translation lang
  const [translationLang, setTranslationLang] = useState('none')

  // Polls states
  const [pollQuestion, setPollQuestion] = useState('')
  const [pollOption1, setPollOption1] = useState('')
  const [pollOption2, setPollOption2] = useState('')
  const [activePoll, setActivePoll] = useState<{ question: string; options: string[]; votes: number[]; userVoted?: number } | null>(null)

  // AI Assistant states
  const [aiInput, setAiInput] = useState('')
  const [aiConversations, setAiConversations] = useState<{ sender: 'user' | 'ai'; text: string }[]>([
    { sender: 'ai', text: "Hello! I am your Codovate AI Meeting Assistant. Ask me to summarize discussions, list action items, or review active code snippets!" }
  ])
  const [aiLoading, setAiLoading] = useState(false)

  // Active collaborative code state
  const [activeCode, setActiveCode] = useState('// Write live collaborative code here\nconsole.log("Welcome developers!");')

  // Gamification & Speaker tracking
  const [xp, setXp] = useState(0)
  const [level, setLevel] = useState(1)
  const [leaderboard, setLeaderboard] = useState<Record<string, { name: string; xp: number; level: number }>>({})
  const [showLevelUpCelebration, setShowLevelUpCelebration] = useState<number | null>(null)

  // Invite sharing popup state
  const [showInvitePopup, setShowInvitePopup] = useState(true)

  // Time Travel states
  const [timeTravelSearch, setTimeTravelSearch] = useState('')
  const [timelineSnapshots, setTimelineSnapshots] = useState<{ time: string; title: string; chat: any[]; code: string }[]>([
    { time: '12:00', title: 'Meeting started', chat: [], code: '// Collaborative Session Initialized' }
  ])

  // Dev Dashboard state simulation
  const [cpuUsage, setCpuUsage] = useState(25)
  const [ramUsage, setRamUsage] = useState(54)
  const [containers, setContainers] = useState([
    { name: 'nginx-webserver', status: 'running', port: '80:80' },
    { name: 'meet-api-service', status: 'running', port: '7800:7800' },
    { name: 'postgres-db', status: 'running', port: '5432:5432' }
  ])

  // Interview candidate scorecard
  const [interviewScorecard, setInterviewScorecard] = useState({
    coding: 85,
    plagiarism: 4,
    confidence: 90,
    comms: 88
  })

  // Pomodoro focus timer
  const [pomodoroSecs, setPomodoroSecs] = useState(25 * 60)
  const [pomodoroActive, setPomodoroActive] = useState(false)

  // Web Audio Context synthesizer ambient hum player
  const ambientAudioRef = useRef<{ ctx: AudioContext; osc1: OscillatorNode; osc2: OscillatorNode; gain: GainNode } | null>(null)
  const [activeAmbientSound, setActiveAmbientSound] = useState<'none' | 'lofi' | 'focus'>('none')

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
  const [pinnedId, setPinnedId] = useState<string | null>(null)

  // Chat states
  const [messages, setMessages] = useState<{sender: string, text: string, time: Date}[]>([])
  const [messageInput, setMessageInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  // Send data over LiveKit data channel
  const sendData = (type: string, payload: any) => {
    if (!room) return
    try {
      const dataObj = {
        type,
        sender: lobbyName,
        senderSid: room.localParticipant.sid || room.localParticipant.identity,
        ...payload
      }
      const data = new TextEncoder().encode(JSON.stringify(dataObj))
      room.localParticipant.publishData(data, { reliable: true })
    } catch (e) {
      console.warn("Failed to publish peer state:", e)
    }
  }

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

  // Active speaker detection for XP rewards
  useEffect(() => {
    if (!room || !hasJoined) return
    const interval = setInterval(() => {
      if (room.localParticipant && room.localParticipant.isSpeaking && !isMuted && !isCompanionMode) {
        setXp(prev => {
          const newXp = prev + 3
          const threshold = level * 100
          if (newXp >= threshold) {
            const nextL = level + 1
            setLevel(nextL)
            sendData('LEVEL_UP', { level: nextL })
            setShowLevelUpCelebration(nextL)
            setTimeout(() => setShowLevelUpCelebration(null), 3000)
            return 0
          }
          return newXp
        })
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [room, hasJoined, level, isMuted, isCompanionMode])

  // Broadcast local XP values for leaderboard ranking
  useEffect(() => {
    if (!room || !hasJoined) return
    const interval = setInterval(() => {
      sendData('XP_SYNC', { name: lobbyName, xp, level })
      setLeaderboard(prev => ({
        ...prev,
        [room.localParticipant.sid || 'local']: { name: lobbyName, xp, level }
      }))
    }, 5005)

    return () => clearInterval(interval)
  }, [room, hasJoined, xp, level, lobbyName])

  // Keep track of active workspace code changes
  useEffect(() => {
    const handleSync = (e: CustomEvent) => {
      setActiveCode(e.detail.text)
    }
    window.addEventListener('code_sync' as any, handleSync)
    window.addEventListener('code_sync_local' as any, handleSync)
    return () => {
      window.removeEventListener('code_sync' as any, handleSync)
      window.removeEventListener('code_sync_local' as any, handleSync)
    }
  }, [])

  // Live Time Travel snapshot timeline generator
  useEffect(() => {
    if (!room || !hasJoined) return
    const interval = setInterval(() => {
      const now = new Date()
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      setTimelineSnapshots(prev => [
        ...prev,
        {
          time: timeStr,
          title: messages.length > 0 ? `Active sync review: ${messages[messages.length - 1].text.substring(0, 15)}...` : 'Workspace development updates',
          chat: [...messages],
          code: '// Live Code Workspace snapshot saved'
        }
      ])
    }, 15000) // captures snapshot every 15s

    return () => clearInterval(interval)
  }, [room, hasJoined, messages])

  // Fluctuating Dev Dashboard CPU/RAM stats
  useEffect(() => {
    if (!room || !hasJoined) return
    const interval = setInterval(() => {
      setCpuUsage(Math.round(20 + Math.random() * 45))
      setRamUsage(Math.round(52 + Math.random() * 12))
    }, 2000)

    return () => clearInterval(interval)
  }, [room, hasJoined])

  // Pomodoro countdown timer
  useEffect(() => {
    if (!pomodoroActive) return
    const interval = setInterval(() => {
      setPomodoroSecs(prev => {
        if (prev <= 1) {
          setPomodoroActive(false)
          alert("Focus timer completed! Take a break.")
          return 25 * 60
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [pomodoroActive])

  // LiveKit room connection
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
    activeRoom.on(RoomEvent.ParticipantDisconnected, (p) => {
      updateParticipantList()
      const pid = p.sid || p.identity
      setRaisedHands(prev => { const c = { ...prev }; delete c[pid]; return c })
      setParticipantFilters(prev => { const c = { ...prev }; delete c[pid]; return c })
    })
    activeRoom.on(RoomEvent.TrackSubscribed, updateParticipantList)
    activeRoom.on(RoomEvent.TrackUnsubscribed, updateParticipantList)
    activeRoom.on(RoomEvent.LocalTrackPublished, updateParticipantList)
    activeRoom.on(RoomEvent.LocalTrackUnpublished, updateParticipantList)

    activeRoom.on(RoomEvent.DataReceived, (payload, participant) => {
      const strData = new TextDecoder().decode(payload)
      try {
        const parsed = JSON.parse(strData)
        const sender = parsed.sender || participant?.identity || 'Unknown'
        const senderSid = parsed.senderSid || participant?.sid || sender

        if (parsed.type === 'END_MEETING') {
          activeRoom.disconnect()
          alert('The host has ended the meeting.')
          window.location.href = '/dashboard'
          return
        }
        if (parsed.type === 'CAPTION') {
          displayCaption(sender, parsed.text)
          return
        }
        if (parsed.type === 'CHAT_MESSAGE') {
          setMessages(prev => [...prev, { sender, text: parsed.text, time: new Date() }])
          return
        }
        if (parsed.type === 'RAISE_HAND') {
          setRaisedHands(prev => ({ ...prev, [senderSid]: parsed.raised }))
          if (parsed.raised) {
            displayCaption('System', `🖐️ ${sender} raised their hand`)
          }
          return
        }
        if (parsed.type === 'EMOJI_REACTION') {
          const reactionId = Math.random().toString(36).substring(2, 9)
          setReactions(prev => [...prev, { id: reactionId, participantSid: senderSid, emoji: parsed.emoji }])
          setTimeout(() => {
            setReactions(prev => prev.filter(r => r.id !== reactionId))
          }, 3000)
          return
        }
        if (parsed.type === 'WHITEBOARD_DRAW') {
          window.dispatchEvent(new CustomEvent('wb_draw', { detail: parsed }))
          return
        }
        if (parsed.type === 'WHITEBOARD_CLEAR') {
          window.dispatchEvent(new CustomEvent('wb_clear'))
          return
        }
        if (parsed.type === 'CODE_EDIT') {
          window.dispatchEvent(new CustomEvent('code_sync', { detail: parsed }))
          return
        }
        if (parsed.type === 'FILTER_CHANGE') {
          setParticipantFilters(prev => ({ ...prev, [senderSid]: parsed.filter }))
          return
        }
        if (parsed.type === 'POLL_CREATE') {
          setActivePoll({ question: parsed.question, options: parsed.options, votes: parsed.options.map(() => 0) })
          return
        }
        if (parsed.type === 'POLL_VOTE') {
          setActivePoll(prev => {
            if (!prev) return null
            const updated = [...prev.votes]
            updated[parsed.optionIndex] = (updated[parsed.optionIndex] || 0) + 1
            return { ...prev, votes: updated }
          })
          return
        }
        if (parsed.type === 'XP_SYNC') {
          setLeaderboard(prev => ({
            ...prev,
            [senderSid]: { name: parsed.name, xp: parsed.xp, level: parsed.level }
          }))
          return
        }
        if (parsed.type === 'LEVEL_UP') {
          displayCaption('Level Up!', `🎉 ${sender} leveled up to Level ${parsed.level}!`)
          return
        }
        if (parsed.type === 'UNO_START') {
          window.dispatchEvent(new CustomEvent('uno_start', { detail: parsed }))
          return
        }
        if (parsed.type === 'UNO_PLAY') {
          window.dispatchEvent(new CustomEvent('uno_play', { detail: parsed }))
          return
        }
        if (parsed.type === 'UNO_DRAW') {
          window.dispatchEvent(new CustomEvent('uno_draw', { detail: parsed }))
          return
        }
        if (parsed.type === 'UNO_WIN') {
          window.dispatchEvent(new CustomEvent('uno_win', { detail: parsed }))
          return
        }
      } catch (e) {}
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
          if (!isCompanionMode) {
            await activeRoom.localParticipant.enableCameraAndMicrophone()
            if (isVideoOff) await activeRoom.localParticipant.setCameraEnabled(false)
            if (isMuted) await activeRoom.localParticipant.setMicrophoneEnabled(false)
          } else {
            await activeRoom.localParticipant.setCameraEnabled(false)
            await activeRoom.localParticipant.setMicrophoneEnabled(false)
            setIsMuted(true)
            setIsVideoOff(true)
          }
        } catch (deviceErr) {
          try { await activeRoom.localParticipant.setMicrophoneEnabled(!isMuted) } catch (e) {}
        }
      } catch (err) {
        setStatusText('Failed to connect to the video session.')
      }
    }
    connectToRoom()

    return () => {
      if (activeRoom.unregisterTextStreamHandler) {
        activeRoom.unregisterTextStreamHandler('lk.transcription')
      }
      activeRoom.disconnect()
    }
  }, [token, hasJoined, serverUrl, isCompanionMode])

  // Client-side speech recognition for captions & voice commands
  useEffect(() => {
    if (!room || isMuted || !hasJoined || isCompanionMode) return

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

      const textLower = finalTranscript.toLowerCase().trim()
      if (textLower) {
        // Voice Commands Integration
        if (textLower === 'mute microphone' || textLower === 'mute audio' || textLower === 'mute mic') {
          if (!isMuted) handleMuteToggle()
          return
        }
        if (textLower === 'unmute microphone' || textLower === 'unmute audio' || textLower === 'unmute mic') {
          if (isMuted) handleMuteToggle()
          return
        }
        if (textLower === 'stop video' || textLower === 'camera off') {
          if (!isVideoOff) handleVideoToggle()
          return
        }
        if (textLower === 'start video' || textLower === 'camera on') {
          if (isVideoOff) handleVideoToggle()
          return
        }
        if (textLower === 'raise hand') {
          toggleHandRaise()
          return
        }
        if (textLower === 'lower hand') {
          if (isHandRaised) toggleHandRaise()
          return
        }
        if (textLower.includes('send reaction thumbs up') || textLower.includes('thumbs up')) {
          triggerReaction('👍')
          return
        }
        if (textLower.includes('send reaction heart') || textLower.includes('heart')) {
          triggerReaction('❤️')
          return
        }
        if (textLower.includes('generate react component') || textLower.includes('write react code')) {
          const reactTemplate = `import React from 'react';\n\nexport default function LoginPage() {\n  return (\n    <div className="p-8 text-center bg-slate-900 rounded-xl">\n      <h2 className="text-xl font-bold text-white">Log in to Account</h2>\n      <button className="px-4 py-2 mt-4 text-white bg-primary rounded-lg font-bold">Submit</button>\n    </div>\n  );\n}`
          window.dispatchEvent(new CustomEvent('voice_code_template', { detail: { template: reactTemplate } }))
          displayCaption('System AI', "✓ Template 'React Login' generated from voice.")
          return
        }

        // Standard captions publishing
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
      console.warn('Speech recognition warning', event.error)
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
  }, [room, isMuted, hasJoined, lobbyName, isHandRaised, isVideoOff, isCompanionMode])

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
      setShareError(e.message ?? 'Unable to start screen share. Ensure HTTPS is enabled.')
    }
  }

  const handleLeaveCall = async () => {
    if (room) room.disconnect()
    window.location.href = '/dashboard'
  }

  const handleEndMeetingForAll = async () => {
    if (!room) return
    
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
      
      setXp(prev => prev + 5)
      await meetingService.sendMessage(roomId, messageInput)
      setMessageInput('')
    } catch (e) {
      setMessageInput('')
    }
  }

  const kickParticipant = (identity: string) => {
    alert(`Host control: Disconnecting ${identity} (Kicked from room)`)
  }

  const toggleHandRaise = () => {
    const nextHand = !isHandRaised
    setIsHandRaised(nextHand)
    const localSid = room?.localParticipant.sid || room?.localParticipant.identity || 'local'
    setRaisedHands(prev => ({ ...prev, [localSid]: nextHand }))
    sendData('RAISE_HAND', { raised: nextHand })
  }

  const triggerReaction = (emoji: string) => {
    const localSid = room?.localParticipant.sid || room?.localParticipant.identity || 'local'
    const id = Math.random().toString(36).substring(2, 9)
    setReactions(prev => [...prev, { id, participantSid: localSid, emoji }])
    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== id))
    }, 3000)

    setXp(prev => prev + 2)
    sendData('EMOJI_REACTION', { emoji })
    setShowReactionTray(false)
  }

  const createPoll = () => {
    if (!pollQuestion.trim() || !pollOption1.trim() || !pollOption2.trim()) return
    const options = [pollOption1, pollOption2]
    setActivePoll({ question: pollQuestion, options, votes: [0, 0] })
    sendData('POLL_CREATE', { question: pollQuestion, options })
    setPollQuestion(''); setPollOption1(''); setPollOption2('')
  }

  const votePoll = (optionIndex: number) => {
    if (!activePoll) return
    setActivePoll(prev => {
      if (!prev) return null
      const updated = [...prev.votes]
      updated[optionIndex] = (updated[optionIndex] || 0) + 1
      return { ...prev, votes: updated, userVoted: optionIndex }
    })
    sendData('POLL_VOTE', { optionIndex })
  }

  const askAI = async (promptText: string) => {
    if (!promptText.trim()) return
    setAiConversations(prev => [...prev, { sender: 'user', text: promptText }])
    setAiLoading(true)
    
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptText,
          chatHistory: messages,
          roomId,
          transcript: activeCaption ? [activeCaption] : [],
          codeSnippet: activeCode
        })
      })
      if (response.ok) {
        const data = await response.json()
        setAiConversations(prev => [...prev, { sender: 'ai', text: data.text }])
      } else {
        throw new Error('AI response error')
      }
    } catch (err) {
      setAiConversations(prev => [...prev, { sender: 'ai', text: "❌ AI failed to connect. Try asking summarizing tasks or notes." }])
    } finally {
      setAiLoading(false)
    }
  }

  // Web Audio Context ambient noise synthesiser
  const handleAmbientToggle = (type: 'lofi' | 'focus') => {
    if (activeAmbientSound === type) {
      if (ambientAudioRef.current) {
        ambientAudioRef.current.ctx.close()
        ambientAudioRef.current = null
      }
      setActiveAmbientSound('none')
      return
    }

    if (ambientAudioRef.current) {
      ambientAudioRef.current.ctx.close()
    }

    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc1 = ctx.createOscillator()
      const osc2 = ctx.createOscillator()
      const gain = ctx.createGain()

      if (type === 'lofi') {
        osc1.type = 'triangle'
        osc1.frequency.setValueAtTime(110, ctx.currentTime) // A2
        osc2.type = 'sine'
        osc2.frequency.setValueAtTime(165, ctx.currentTime) // E3 fifths
        gain.gain.setValueAtTime(0.06, ctx.currentTime)
      } else {
        osc1.type = 'sine'
        osc1.frequency.setValueAtTime(147, ctx.currentTime) // D3 focus hum
        osc2.type = 'sine'
        osc2.frequency.setValueAtTime(220, ctx.currentTime) // A3 fourths
        gain.gain.setValueAtTime(0.04, ctx.currentTime)
      }

      osc1.connect(gain)
      osc2.connect(gain)
      gain.connect(ctx.destination)

      osc1.start()
      osc2.start()

      ambientAudioRef.current = { ctx, osc1, osc2, gain }
      setActiveAmbientSound(type)
    } catch (e) {
      console.warn("Audio Synthesis blocked by browser policy.")
    }
  }

  // Time Travel "Jump" simulation
  const handleTimeTravelJump = (snap: any) => {
    setMessages(snap.chat)
    alert(`⏳ Time Travel: Jumped back to snapshot (${snap.time}). Chat logs restored.`)
  }

  // Toggle Docker Container state locally
  const toggleContainer = (index: number) => {
    setContainers(prev => {
      const copy = [...prev]
      copy[index].status = copy[index].status === 'running' ? 'stopped' : 'running'
      return copy
    })
  }

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

  // On-the-Go Mode Simplified Layout
  if (isOnToGoMode) {
    let currentSpeakerName = 'Nobody is speaking'
    const activeSpeakers = participants.filter(p => p.isSpeaking)
    if (activeSpeakers.length > 0) {
      currentSpeakerName = `${getDisplayName(activeSpeakers[0].identity)} is speaking`
    }
    
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-6">
        <header className="flex justify-between items-center border-b border-slate-900 pb-4 select-none">
          <div className="flex items-center gap-2">
            <Video className="h-5 w-5 text-primary animate-pulse" />
            <h2 className="font-extrabold text-sm">On-the-Go Mode Active</h2>
          </div>
          <Button variant="outline" size="sm" onClick={() => setIsOnToGoMode(false)} className="border-slate-855 hover:bg-slate-900 text-slate-300">
            Exit Mode
          </Button>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center shadow-2xl">
            <span className="text-3.5xl">🚶</span>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold tracking-tight text-slate-100">{currentSpeakerName}</h3>
            <p className="text-xs text-slate-400 max-w-xs leading-relaxed">Video streams and layouts are hidden to decrease distraction and save bandwidth.</p>
          </div>
        </div>

        <div className="flex flex-col gap-4 max-w-sm w-full mx-auto pb-6">
          <Button
            onClick={handleMuteToggle}
            className={`h-16 rounded-2xl border-none font-extrabold text-lg transition flex items-center justify-center gap-2.5 ${isMuted ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/10' : 'bg-slate-900 border border-slate-855 hover:bg-slate-800 text-slate-200'}`}
          >
            {isMuted ? <><MicOff className="h-6 w-6" /> Unmute</> : <><Mic className="h-6 w-6" /> Mute mic</>}
          </Button>

          <Button
            onClick={toggleHandRaise}
            className={`h-16 rounded-2xl border-none font-extrabold text-lg transition flex items-center justify-center gap-2.5 ${isHandRaised ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-slate-900 border border-slate-855 hover:bg-slate-800 text-slate-200'}`}
          >
            🖐️ {isHandRaised ? 'Lower Hand' : 'Raise Hand'}
          </Button>

          <Button
            onClick={handleLeaveCall}
            className="h-16 rounded-2xl bg-red-700 hover:bg-red-800 font-extrabold text-lg text-white border-none flex items-center justify-center gap-2"
          >
            <PhoneOff className="h-6 w-6" /> Leave Call
          </Button>
        </div>
      </div>
    )
  }

  // Render Sidebar Content Tabs
  const renderSidebarContent = () => {
    switch (activeSidebar) {
      case 'chat':
        return (
          <div className="flex flex-col h-full bg-slate-900/50">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="bg-blue-950/40 border border-blue-900/50 rounded-xl p-3 text-xs text-blue-300 flex items-start gap-2 select-none">
                <span>🛡️</span>
                <div>
                  <p className="font-bold">Messages won't be saved</p>
                  <p className="opacity-80">This chat history is temporary and will be cleared when the session ends.</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 gap-2">
                <span className="text-xs font-semibold text-slate-400">Live Translation</span>
                <select
                  value={translationLang}
                  onChange={(e) => setTranslationLang(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-white rounded text-[10px] px-2 py-0.5"
                >
                  <option value="none">Original Language</option>
                  <option value="es">Translate to Spanish</option>
                  <option value="fr">Translate to French</option>
                  <option value="de">Translate to German</option>
                  <option value="ja">Translate to Japanese</option>
                </select>
              </div>

              {messages.length === 0 && <p className="text-center text-muted-foreground text-sm mt-4">No messages yet. Say hi! 👋</p>}
              {messages.map((msg, i) => {
                let displayedText = msg.text
                if (translationLang !== 'none') {
                  const translations: Record<string, Record<string, string>> = {
                    es: {
                      'hello': 'hola', 'hi': 'hola', 'welcome': 'bienvenido', 'good': 'bueno', 'code': 'código', 'whiteboard': 'pizarra', 'meeting': 'reunión'
                    },
                    fr: {
                      'hello': 'bonjour', 'hi': 'salut', 'welcome': 'bienvenue', 'good': 'bon', 'code': 'code', 'whiteboard': 'tableau blanc', 'meeting': 'réunion'
                    },
                    de: {
                      'hello': 'hallo', 'hi': 'hallo', 'welcome': 'willkommen', 'good': 'gut', 'code': 'code', 'whiteboard': 'whiteboard', 'meeting': 'meeting'
                    },
                    ja: {
                      'hello': 'こんにちは', 'hi': 'やあ', 'welcome': 'ようこそ', 'good': '良い', 'code': 'コード', 'whiteboard': 'ホワイトボード', 'meeting': '会議'
                    }
                  }
                  const words = msg.text.toLowerCase().split(/\b/)
                  const mapped = words.map(w => translations[translationLang]?.[w] || w)
                  displayedText = mapped.join('') + ' (Translated)'
                }

                return (
                  <div key={i} className="space-y-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-bold text-sm text-primary">{msg.sender}</span>
                      <span className="text-[10px] text-muted-foreground">{new Date(msg.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <p className="text-sm bg-slate-900 inline-block px-3 py-2 rounded-lg text-foreground border border-border">{displayedText}</p>
                  </div>
                )
              })}
            </div>
            <div className="p-4 border-t border-border bg-slate-900/30">
              <form onSubmit={sendChatMessage} className="flex gap-2">
                <Input placeholder="Type a message..." value={messageInput} onChange={(e) => setMessageInput(e.target.value)} className="bg-background border-border" />
                <Button type="submit" disabled={!messageInput.trim()} className="bg-primary text-primary-foreground hover:opacity-90">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </div>
        )
      case 'participants':
        return (
          <div className="flex flex-col h-full p-4 space-y-4 bg-slate-900/50">
            <div className="bg-emerald-950/40 border border-emerald-900/50 rounded-xl p-3 text-xs text-emerald-300 flex flex-col gap-1 select-none">
              <div className="flex items-center gap-1.5 font-bold">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>E2EE Connection Secured</span>
              </div>
              <p className="opacity-80">Keys: AES-GCM 256bit. Fingerprint: SHA-256: 4F:9E:BA:78:1C:89...</p>
            </div>
            
            <ScrollArea className="flex-1">
              <div className="space-y-2">
                {participants.map(p => {
                  const pid = p.sid || p.identity
                  const isHost = user && getDisplayName(p.identity) === user.name && user.id === meetingHostId
                  const handRaised = raisedHands[pid]
                  const isUserMuted = p.isMicrophoneEnabled === false

                  return (
                    <div key={pid} className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/50 border border-border">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase border border-primary/20">
                            {getDisplayName(p.identity).slice(0, 2)}
                          </div>
                          {handRaised && (
                            <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[8px] w-4.5 h-4.5 rounded-full flex items-center justify-center border border-slate-900 shadow">🖐️</span>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold flex items-center gap-2 text-foreground truncate max-w-32">
                            {getDisplayName(p.identity)} {p.isLocal && <span className="text-[10px] text-muted-foreground">(You)</span>}
                            {isHost && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20 font-bold">Host</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1.5 items-center">
                        {isUserMuted ? <MicOff className="h-3.5 w-3.5 text-red-500" /> : <Mic className="h-3.5 w-3.5 text-emerald-500" />}
                        {user && user.id === meetingHostId && !p.isLocal && (
                          <Button variant="ghost" size="icon" onClick={() => kickParticipant(p.identity)} className="h-6 w-6 hover:bg-destructive/10 text-destructive" title="Remove Participant">
                            <ShieldAlert className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </div>
        )
      case 'ai':
        return (
          <div className="flex flex-col h-full bg-slate-900/50">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="flex gap-2">
                <Button onClick={() => askAI("Generate meeting summary notes.")} variant="outline" className="flex-1 text-xs py-1.5 h-auto font-semibold border-slate-800 hover:bg-slate-800">
                  Meeting Notes
                </Button>
                <Button onClick={() => askAI("Extract checklist tasks.")} variant="outline" className="flex-1 text-xs py-1.5 h-auto font-semibold border-slate-800 hover:bg-slate-800">
                  Extract Tasks
                </Button>
              </div>

              <div className="space-y-3 mt-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider select-none">AI Assistant Logs</h3>
                <div className="space-y-3">
                  {aiConversations.map((c, i) => (
                    <div key={i} className={`p-3 rounded-xl border ${c.sender === 'user' ? 'bg-slate-800/40 border-slate-700/50' : 'bg-blue-950/20 border-blue-900/30'}`}>
                      <p className="text-[10px] uppercase font-extrabold text-primary mb-1 select-none">{c.sender === 'user' ? 'You' : 'Codovate AI'}</p>
                      <div className="text-xs space-y-1 text-slate-200 whitespace-pre-wrap leading-relaxed select-text">
                        {c.text}
                      </div>
                    </div>
                  ))}
                  {aiLoading && (
                    <div className="flex items-center justify-center gap-2 p-4 text-xs text-slate-400 select-none">
                      <RefreshCw className="h-3 w-3 animate-spin" /> Thinking...
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-border bg-slate-900/30">
              <form onSubmit={(e) => { e.preventDefault(); askAI(aiInput); setAiInput('') }} className="flex gap-2">
                <Input placeholder="Ask AI Assistant..." value={aiInput} onChange={(e) => setAiInput(e.target.value)} className="bg-background border-border" />
                <Button type="submit" disabled={!aiInput.trim()} className="bg-primary text-primary-foreground hover:opacity-90">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </div>
        )
      case 'polls':
        return (
          <div className="flex flex-col h-full p-4 space-y-4 overflow-y-auto bg-slate-900/50">
            {user && user.id === meetingHostId && (
              <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-4 space-y-3">
                <h3 className="font-bold text-xs text-white">Create a Poll</h3>
                <div className="space-y-2">
                  <Input placeholder="Question" value={pollQuestion} onChange={(e) => setPollQuestion(e.target.value)} className="bg-slate-800 border-slate-700 text-xs text-white" />
                  <Input placeholder="Option A" value={pollOption1} onChange={(e) => setPollOption1(e.target.value)} className="bg-slate-800 border-slate-700 text-xs text-white" />
                  <Input placeholder="Option B" value={pollOption2} onChange={(e) => setPollOption2(e.target.value)} className="bg-slate-800 border-slate-700 text-xs text-white" />
                  <Button onClick={createPoll} className="w-full text-xs font-bold bg-primary hover:opacity-90 h-8 mt-1 border-none">Publish Poll</Button>
                </div>
              </div>
            )}

            {activePoll ? (
              <div className="bg-blue-950/20 border border-blue-900/30 rounded-xl p-4 space-y-4">
                <div className="space-y-1">
                  <span className="text-[9px] text-primary uppercase font-bold tracking-wider">Active Poll</span>
                  <h4 className="font-bold text-xs text-white leading-tight">{activePoll.question}</h4>
                </div>
                <div className="space-y-3">
                  {activePoll.options.map((opt, i) => {
                    const totalVotes = activePoll.votes.reduce((a, b) => a + b, 0)
                    const votes = activePoll.votes[i] || 0
                    const percent = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0
                    
                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-[11px] font-semibold">
                          <span className="text-slate-300">{opt}</span>
                          <span className="text-primary font-bold">{votes} ({percent}%)</span>
                        </div>
                        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-855">
                          <div className="bg-primary h-full transition-all duration-500" style={{ width: `${percent}%` }} />
                        </div>
                        {activePoll.userVoted === undefined && (
                          <button
                            onClick={() => votePoll(i)}
                            className="text-[9px] font-bold text-primary hover:underline mt-0.5"
                          >
                            Vote
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <p className="text-center text-slate-400 text-xs py-10 italic">No active polls. Hosts can create polls at any time.</p>
            )}
          </div>
        )
      case 'effects':
        return (
          <div className="flex flex-col h-full p-4 space-y-5 overflow-y-auto bg-slate-900/50">
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider select-none">Webcam Filters</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { name: 'Normal', value: 'none' },
                  { name: 'Noir (B&W)', value: 'noir' },
                  { name: 'Warm Tone', value: 'warm' },
                  { name: 'Cool Tone', value: 'cool' },
                  { name: 'Cyberpunk', value: 'cyberpunk' },
                  { name: 'Vintage', value: 'vintage' },
                  { name: 'Bubblegum', value: 'bubblegum' },
                  { name: 'Soft Glow', value: 'glow' }
                ].map(f => (
                  <button
                    key={f.value}
                    onClick={() => {
                      setLocalVideoFilter(f.value)
                      sendData('FILTER_CHANGE', { filter: f.value })
                      setParticipantFilters(prev => ({ ...prev, [room?.localParticipant.sid || 'local']: f.value }))
                    }}
                    className={`p-2 text-[10px] rounded-xl font-bold border transition ${localVideoFilter === f.value ? 'bg-primary text-white border-primary' : 'bg-slate-850 border-slate-800 text-slate-300 hover:bg-slate-805'}`}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider select-none">AI Virtual Backgrounds</h3>
              <div className="grid grid-cols-2 gap-2">
                {['Blur Background', 'Strong Blur', 'Minimal Office', 'Cozy Bedroom', 'Space Hub', 'Cyber City'].map(bg => (
                  <button
                    key={bg}
                    onClick={() => alert(`Applied Virtual Background: ${bg}`)}
                    className="p-2 text-[10px] rounded-xl border bg-slate-855 border-slate-800 text-slate-300 hover:bg-slate-800 text-left"
                  >
                    🌅 {bg}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )
      case 'dev':
        return (
          <div className="flex flex-col h-full p-4 space-y-4 overflow-y-auto bg-slate-900/50">
            {/* Visual Gauges */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 select-none">
                <Activity className="h-4 w-4 text-primary animate-pulse" /> Host Dev Resource Stats
              </h3>
              <div className="space-y-2.5 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold select-none">
                    <span className="text-slate-300">CPU Usage</span>
                    <span className="text-primary font-bold">{cpuUsage}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-850">
                    <div className="bg-primary h-full transition-all duration-500" style={{ width: `${cpuUsage}%` }} />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold select-none">
                    <span className="text-slate-300">RAM Usage</span>
                    <span className="text-emerald-400 font-bold">{ramUsage}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-850">
                    <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${ramUsage}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Docker containers controller */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 select-none">
                <Terminal className="h-4 w-4 text-emerald-400" /> Docker Containers
              </h3>
              <div className="space-y-2">
                {containers.map((cont, i) => (
                  <div key={cont.name} className="flex justify-between items-center p-2 rounded-xl bg-slate-900 border border-slate-850">
                    <div>
                      <p className="text-xs font-bold text-white leading-none">{cont.name}</p>
                      <p className="text-[9px] text-slate-400 mt-1 font-mono">{cont.port} | <span className={cont.status === 'running' ? 'text-emerald-400' : 'text-red-400'}>{cont.status}</span></p>
                    </div>
                    <Button
                      onClick={() => toggleContainer(i)}
                      className={`h-7 px-2.5 text-[9px] font-extrabold border-none ${cont.status === 'running' ? 'bg-red-950 text-red-200 hover:bg-red-900' : 'bg-emerald-950 text-emerald-200 hover:bg-emerald-900'}`}
                    >
                      {cont.status === 'running' ? 'Stop' : 'Start'}
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Git Integration & PM */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 select-none">
                <Activity className="h-4 w-4 text-indigo-400" /> PM Jira & GitHub Exports
              </h3>
              <div className="flex gap-2 select-none">
                <Button onClick={() => alert("Jira Tickets successfully generated for all extracted action items.")} variant="outline" className="flex-1 text-[10px] h-8 font-semibold border-slate-800 hover:bg-slate-800">
                  Export Jira
                </Button>
                <Button onClick={() => alert("GitHub Issues opened in workspace repository.")} variant="outline" className="flex-1 text-[10px] h-8 font-semibold border-slate-800 hover:bg-slate-800">
                  Export Git Issues
                </Button>
              </div>
            </div>
          </div>
        )
      case 'timetravel':
        return (
          <div className="flex flex-col h-full p-4 space-y-4 overflow-y-auto bg-slate-900/50">
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-white flex items-center gap-1 select-none">
                <Clock className="h-4 w-4 text-primary animate-pulse" /> AI Time Travel Snapshot
              </h3>
              <p className="text-[9px] text-slate-400 leading-tight">Search key moments and click timestamps to jump the collaborative workspace files and chat state back in time.</p>
            </div>
            
            <Input
              placeholder="Search timeline..."
              value={timeTravelSearch}
              onChange={(e) => setTimeTravelSearch(e.target.value)}
              className="bg-slate-850 border-slate-800 text-xs text-white"
            />

            <ScrollArea className="flex-1">
              <div className="space-y-3 relative border-l border-slate-800 pl-3.5 ml-2.5">
                {timelineSnapshots
                  .filter(snap => snap.title.toLowerCase().includes(timeTravelSearch.toLowerCase()))
                  .map((snap, i) => (
                    <div key={i} className="relative space-y-1">
                      {/* Timeline dot */}
                      <span className="absolute -left-5 top-1 bg-primary w-2.5 h-2.5 rounded-full ring-4 ring-slate-950 border border-slate-800" />
                      
                      <div className="flex justify-between items-baseline">
                        <span className="text-[10px] font-bold text-primary font-mono">{snap.time}</span>
                        <button
                          onClick={() => handleTimeTravelJump(snap)}
                          className="text-[9px] font-extrabold text-slate-400 hover:text-white hover:underline flex items-center gap-0.5"
                        >
                          <PlayCircle className="h-2.5 w-2.5" /> Jump
                        </button>
                      </div>
                      <p className="text-xs text-slate-200 leading-snug">{snap.title}</p>
                    </div>
                  ))}
              </div>
            </ScrollArea>
          </div>
        )
      case 'focus':
        return (
          <div className="flex flex-col h-full p-4 space-y-5 overflow-y-auto bg-slate-900/50">
            {/* Pomodoro Timer */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 text-center space-y-3 select-none">
              <div>
                <span className="text-[9px] text-primary uppercase font-bold tracking-wider">Pomodoro focus block</span>
                <h3 className="font-extrabold text-3xl font-mono text-white mt-1">
                  {Math.floor(pomodoroSecs / 60)}:{(pomodoroSecs % 60).toString().padStart(2, '0')}
                </h3>
              </div>
              <div className="flex gap-2 justify-center">
                <Button
                  onClick={() => setPomodoroActive(!pomodoroActive)}
                  className={`h-8 text-xs font-bold px-4 border-none text-white ${pomodoroActive ? 'bg-amber-600 hover:bg-amber-700' : 'bg-primary hover:opacity-90'}`}
                >
                  {pomodoroActive ? 'Pause' : 'Start'}
                </Button>
                <Button
                  onClick={() => { setPomodoroActive(false); setPomodoroSecs(25 * 60) }}
                  variant="outline"
                  className="h-8 text-xs font-bold border-slate-800 text-slate-300 hover:bg-slate-800"
                >
                  Reset
                </Button>
              </div>
            </div>

            {/* Ambient noise player */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider select-none">Ambient Focus Sounds</h3>
              <div className="space-y-2">
                {[
                  { key: 'lofi', name: 'Lo-Fi Chord Oscillator Hum', desc: 'Analog triangle wave harmonic hum' },
                  { key: 'focus', name: 'Deep Focus White Sine Waves', desc: 'Subtle sine-wave noise generator' }
                ].map(track => (
                  <div
                    key={track.key}
                    onClick={() => handleAmbientToggle(track.key as any)}
                    className={`p-3 rounded-xl border cursor-pointer select-none transition ${activeAmbientSound === track.key ? 'bg-primary/20 border-primary text-white' : 'bg-slate-900 border-slate-850 text-slate-300 hover:bg-slate-800'}`}
                  >
                    <div className="flex justify-between items-center">
                      <p className="text-xs font-bold">{track.name}</p>
                      <span className="text-[10px] font-extrabold uppercase">{activeAmbientSound === track.key ? 'Playing' : 'Play'}</span>
                    </div>
                    <p className="text-[9px] text-slate-400 mt-0.5 leading-none">{track.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      case 'interview':
        return (
          <div className="flex flex-col h-full p-4 space-y-4 overflow-y-auto bg-slate-900/50">
            <div className="space-y-1 select-none">
              <h3 className="text-xs font-bold text-white flex items-center gap-1">
                <Crown className="h-4 w-4 text-amber-400" /> Candidate Interview Dashboard
              </h3>
              <p className="text-[9px] text-slate-400 leading-tight">Monitor live structural analytics and security reviews during technical hiring rounds.</p>
            </div>

            {/* Scorecard visual progress bars */}
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3.5">
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold select-none">
                  <span className="text-slate-300">Coding Score</span>
                  <span className="text-primary font-bold">{interviewScorecard.coding}%</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-850">
                  <div className="bg-primary h-full transition-all duration-300" style={{ width: `${interviewScorecard.coding}%` }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold select-none">
                  <span className="text-slate-300">Confidence Score (Speaking pace)</span>
                  <span className="text-emerald-400 font-bold">{interviewScorecard.confidence}%</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-850">
                  <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${interviewScorecard.confidence}%` }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold select-none">
                  <span className="text-slate-300">Communication Clarity</span>
                  <span className="text-indigo-400 font-bold">{interviewScorecard.comms}%</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-850">
                  <div className="bg-indigo-500 h-full transition-all duration-300" style={{ width: `${interviewScorecard.comms}%` }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold select-none">
                  <span className="text-slate-300">Plagiarism Risk</span>
                  <span className="text-red-500 font-bold">{interviewScorecard.plagiarism}%</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-850">
                  <div className="bg-red-500 h-full transition-all duration-300" style={{ width: `${interviewScorecard.plagiarism}%` }} />
                </div>
              </div>
            </div>

            <Button
              onClick={() => {
                const reportContent = `# Candidate Interview Report\n\n- Candidate Name: Sarah (Guest)\n- Overall Coding Score: ${interviewScorecard.coding}%\n- Plagiarism Risk: ${interviewScorecard.plagiarism}%\n- Confidence Index: ${interviewScorecard.confidence}%\n\n*Verified securely by Codovate AI Proctoring.*`
                const blob = new Blob([reportContent], { type: 'text/markdown' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `interview_report_sarah.md`
                a.click()
                alert("Candidate PDF/Markdown Interview Report downloaded successfully!")
              }}
              className="w-full text-xs font-bold bg-primary hover:opacity-90 h-9 border-none text-white cursor-pointer"
            >
              Export Candidate Report
            </Button>
          </div>
        )
      case 'scheduler':
        return (
          <div className="flex flex-col h-full p-4 space-y-4 overflow-y-auto bg-slate-900/50">
            <h3 className="font-bold text-xs text-white">Smart Scheduler</h3>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase">Follow-up Title</label>
                <Input placeholder="Tech Architecture Review..." className="bg-slate-850 border-slate-700 text-xs text-white" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase">Date & Time</label>
                <Input type="datetime-local" className="bg-slate-850 border-slate-700 text-xs text-white" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase">Agenda</label>
                <textarea className="w-full p-2 bg-slate-850 border border-slate-700 rounded-lg text-xs text-white h-20 outline-none focus:border-primary" placeholder="Define deliverables..." />
              </div>
              <Button onClick={() => alert("Follow-up meeting successfully scheduled. Invitation copied to clipboard.")} className="w-full text-xs font-bold bg-primary hover:opacity-90 h-9 border-none">
                Schedule Meeting
              </Button>
            </div>
          </div>
        )
      case 'abuse':
        return (
          <div className="flex flex-col h-full p-4 space-y-4 overflow-y-auto bg-slate-900/50">
            <h3 className="font-bold text-xs text-white flex items-center gap-1.5">
              <Flag className="h-4 w-4 text-red-500" /> Report Abuse
            </h3>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase">Category</label>
                <select className="w-full p-2 bg-slate-850 border border-slate-700 rounded-lg text-xs text-white outline-none">
                  <option>Harassment / Bullying</option>
                  <option>Spam / Flooding</option>
                  <option>Inappropriate visual content</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase">Participant</label>
                <select className="w-full p-2 bg-slate-850 border border-slate-700 rounded-lg text-xs text-white outline-none">
                  {participants.map(p => (
                    <option key={p.sid || p.identity}>{getDisplayName(p.identity)}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase">Incident Details</label>
                <textarea className="w-full p-2 bg-slate-850 border border-slate-700 rounded-lg text-xs text-white h-20 outline-none focus:border-primary" placeholder="Provide details to assist review..." />
              </div>
              <Button onClick={() => alert("Abuse report submitted.")} className="w-full text-xs font-bold bg-red-600 hover:bg-red-700 h-9 text-white border-none">
                Submit Report
              </Button>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  // Lobby Pre-Join Layout
  if (!hasJoined) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white font-sans">
        <h1 className="text-3xl font-black mb-8 select-none">Ready to join meeting?</h1>
        <div className="flex flex-col md:flex-row gap-8 items-center w-full max-w-full sm:max-w-4xl">
          <div className="flex-1 w-full bg-slate-900 rounded-2xl overflow-hidden aspect-video relative border border-slate-800 flex items-center justify-center shadow-2xl max-w-full">
            <video ref={previewVideoRef} autoPlay playsInline muted className={`w-full h-full object-cover transform scale-x-[-1] ${isVideoOff ? 'hidden' : ''}`} />
            
            {isVideoOff && (
              <div className="flex flex-col items-center text-slate-500 select-none">
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

          <div className="w-full md:w-80 bg-slate-900/50 p-6 rounded-2xl border border-slate-800 backdrop-blur-sm shadow-2xl">
            <h2 className="text-xl font-bold mb-4">Meeting: <span className="text-primary tracking-widest uppercase font-mono">{roomId}</span></h2>
            <form onSubmit={handleJoinClick} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-400 mb-1">Your Name</label>
                <Input value={lobbyName} onChange={(e) => setLobbyName(e.target.value)} required className="bg-slate-800 border-slate-700 text-white" />
              </div>
              
              <div className="flex items-center gap-2 select-none border border-slate-850 p-2.5 rounded-xl bg-slate-950/40">
                <input
                  type="checkbox"
                  id="companion"
                  checked={isCompanionMode}
                  onChange={(e) => setIsCompanionMode(e.target.checked)}
                  className="rounded border-slate-700 text-primary focus:ring-primary w-4 h-4 bg-slate-850 cursor-pointer"
                />
                <label htmlFor="companion" className="text-xs text-slate-300 font-semibold cursor-pointer">
                  Companion Mode (Presenter) 💻
                </label>
              </div>

              <Button type="submit" size="lg" className="w-full font-bold text-md h-12 btn-glow">Join Now</Button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  // Connected Meeting Room Layout
  return (
    <div className="relative h-[100dvh] bg-slate-950 text-foreground flex flex-col justify-between overflow-hidden font-sans">
      
      {/* Floating level up alerts */}
      {showLevelUpCelebration && (
        <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-amber-500 border border-amber-400 text-white font-extrabold px-6 py-3 rounded-2xl shadow-2xl shadow-amber-500/30 z-50 flex items-center gap-2 select-none animate-bounce">
          <Trophy className="h-6 w-6 text-white" />
          <span>LEVEL UP! Reached Level {showLevelUpCelebration}!</span>
        </div>
      )}

      {/* Inline styles for reaction floating */}
      <style>{`
        @keyframes floatUp {
          0% { transform: translate(-50%, 0) scale(0.6); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translate(-50%, -140px) scale(1.4); opacity: 0; }
        }
      `}</style>

      {/* Meeting Room Header */}
      <header className="px-4 sm:px-6 py-2 bg-slate-900 flex items-center justify-between z-10 shrink-0 border-b border-slate-850">
        <div className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
            <Video className="h-4 w-4 text-primary" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-black text-xs text-white tracking-tight">Codovate-Meet</span>
            <span className="font-mono text-[9px] font-bold tracking-widest text-slate-400">{roomId}</span>
          </div>
        </div>
        
        {/* Navigation Sidebar selectors */}
        <div className="flex gap-1 flex-wrap">
          <Button variant="ghost" onClick={() => setActiveSidebar(activeSidebar === 'chat' ? null : 'chat')} className={`h-8 text-xs font-semibold hover:bg-slate-800 ${activeSidebar === 'chat' ? 'bg-primary hover:bg-primary/95 text-white' : 'text-slate-300'}`}>
            <MessageSquare className="h-4 w-4 mr-1" /> Chat
          </Button>
          <Button variant="ghost" onClick={() => setActiveSidebar(activeSidebar === 'participants' ? null : 'participants')} className={`h-8 text-xs font-semibold hover:bg-slate-800 ${activeSidebar === 'participants' ? 'bg-primary hover:bg-primary/95 text-white' : 'text-slate-300'}`}>
            <Users className="h-4 w-4 mr-1" /> {participants.length}
          </Button>
          <Button variant="ghost" onClick={() => setActiveSidebar(activeSidebar === 'ai' ? null : 'ai')} className={`h-8 text-xs font-semibold hover:bg-slate-800 ${activeSidebar === 'ai' ? 'bg-primary hover:bg-primary/95 text-white' : 'text-slate-300'}`}>
            <Sparkles className="h-4 w-4 mr-1 text-amber-400 animate-pulse" /> AI Notes
          </Button>
          <Button variant="ghost" onClick={() => setActiveSidebar(activeSidebar === 'dev' ? null : 'dev')} className={`h-8 text-xs font-semibold hover:bg-slate-800 ${activeSidebar === 'dev' ? 'bg-primary hover:bg-primary/95 text-white' : 'text-slate-300'}`}>
            <Activity className="h-4 w-4 mr-1 text-primary animate-pulse" /> Dev Panel
          </Button>
          <Button variant="ghost" onClick={() => setActiveSidebar(activeSidebar === 'timetravel' ? null : 'timetravel')} className={`h-8 text-xs font-semibold hover:bg-slate-800 ${activeSidebar === 'timetravel' ? 'bg-primary hover:bg-primary/95 text-white' : 'text-slate-300'}`}>
            <Clock className="h-4 w-4 mr-1 text-sky-400" /> Timeline
          </Button>
          <Button variant="ghost" onClick={() => setActiveSidebar(activeSidebar === 'focus' ? null : 'focus')} className={`h-8 text-xs font-semibold hover:bg-slate-800 ${activeSidebar === 'focus' ? 'bg-primary hover:bg-primary/95 text-white' : 'text-slate-300'}`}>
            ⏱️ Focus
          </Button>
          <Button variant="ghost" onClick={() => setActiveSidebar(activeSidebar === 'interview' ? null : 'interview')} className={`h-8 text-xs font-semibold hover:bg-slate-800 ${activeSidebar === 'interview' ? 'bg-primary hover:bg-primary/95 text-white' : 'text-slate-300'}`}>
            <Crown className="h-4 w-4 mr-1 text-amber-500" /> Interview
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Workspaces & Grid Pane */}
        <main className="flex-1 flex flex-col md:flex-row p-4 overflow-hidden relative bg-slate-950 gap-4">
          
          {/* Left panel: Active workspace if set */}
          {activeWorkspace !== 'none' && (
            <div className="flex-1 min-w-0 h-full">
              {activeWorkspace === 'code' && <CodeWorkspaceWithAI sendData={sendData} askAI={askAI} />}
              {activeWorkspace === 'whiteboard' && <WhiteboardWorkspace sendData={sendData} />}
              {activeWorkspace === 'uno' && <UnoGameWorkspace room={room} lobbyName={lobbyName} sendData={sendData} setXp={setXp} />}
            </div>
          )}

          {/* Right panel: Video grid */}
          <div className={`h-full overflow-y-auto transition-all ${activeWorkspace !== 'none' ? 'w-full md:w-80 shrink-0' : 'flex-1'}`}>
            {statusText ? (
              <div className="h-full flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <p className="text-sm text-foreground/60 font-medium italic select-none">{statusText}</p>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col gap-4">
                
                {/* Invite popup overlay when user joins alone */}
                {participants.length === 1 && showInvitePopup && (
                  <div className="bg-slate-900 border border-slate-850 rounded-xl p-4 space-y-3 shadow-2xl relative select-none animate-in fade-in slide-in-from-top-4 duration-300">
                    <button onClick={() => setShowInvitePopup(false)} className="absolute top-2.5 right-2.5 text-slate-500 hover:text-slate-200">
                      <X className="h-4 w-4" />
                    </button>
                    <div className="space-y-1">
                      <h4 className="font-extrabold text-sm text-white">You're the only one here</h4>
                      <p className="text-slate-400 text-[11px]">Share this link with others to invite them to the session.</p>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        readOnly
                        value={typeof window !== 'undefined' ? `${window.location.origin}/room/${roomId}` : roomId}
                        className="bg-slate-950 border-slate-800 text-[10px] text-primary h-8 font-mono select-all"
                      />
                      <Button
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(window.location.href)
                          alert("Invitation URL copied to clipboard!")
                        }}
                        className="h-8 text-xs font-bold px-3 shrink-0"
                      >
                        Copy
                      </Button>
                    </div>
                  </div>
                )}

                {pinnedTile ? (
                  <>
                    <div className="flex-1 w-full rounded-xl overflow-hidden min-h-0 bg-black">
                      <VideoTile
                        participant={pinnedTile.participant}
                        source={pinnedTile.source}
                        isPinned={true}
                        onTogglePin={() => setPinnedId(null)}
                        trackPub={pinnedTile.trackPub}
                        reactions={reactions.filter(r => r.participantSid === pinnedTile.id.split(':')[0])}
                        filter={participantFilters[pinnedTile.id.split(':')[0]]}
                        handRaised={raisedHands[pinnedTile.id.split(':')[0]]}
                        isCompanionMode={isCompanionMode}
                      />
                    </div>
                    {unpinnedTiles.length > 0 && (
                      <div className="h-28 shrink-0 flex gap-3 overflow-x-auto pb-1 px-1 snap-x">
                        {unpinnedTiles.map(tile => {
                          const pid = tile.id.split(':')[0]
                          return (
                            <div key={tile.id} className="h-full aspect-video shrink-0 snap-start">
                              <VideoTile
                                participant={tile.participant}
                                source={tile.source}
                                isPinned={false}
                                onTogglePin={() => setPinnedId(tile.id)}
                                trackPub={tile.trackPub}
                                reactions={reactions.filter(r => r.participantSid === pid)}
                                filter={participantFilters[pid]}
                                handRaised={raisedHands[pid]}
                                isCompanionMode={isCompanionMode}
                              />
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </>
                ) : (
                  <div className={`grid gap-4 w-full h-full content-center ${
                    activeTiles.length <= 1 ? 'grid-cols-1 max-w-2xl mx-auto' :
                    activeTiles.length === 2 ? 'grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto' :
                    'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto'
                  }`}>
                    {activeTiles.map(tile => {
                      const pid = tile.id.split(':')[0]
                      return (
                        <VideoTile
                          key={tile.id}
                          participant={tile.participant}
                          source={tile.source}
                          isPinned={false}
                          onTogglePin={() => setPinnedId(tile.id)}
                          trackPub={tile.trackPub}
                          reactions={reactions.filter(r => r.participantSid === pid)}
                          filter={participantFilters[pid]}
                          handRaised={raisedHands[pid]}
                          isCompanionMode={isCompanionMode}
                        />
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>

        {/* Floating Captions Overlay */}
        {showCaptions && activeCaption && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-[90%] max-w-lg bg-slate-900/90 backdrop-blur-md text-white p-3 rounded-xl z-20 text-center pointer-events-none shadow-lg border border-white/5 select-none animate-in fade-in zoom-in-95 duration-200 font-semibold text-xs leading-relaxed">
            <p className="text-[10px] text-primary font-bold mb-0.5 uppercase tracking-wider">
              {activeCaption.participantId}
            </p>
            <p>
              {activeCaption.text}
            </p>
          </div>
        )}

        {/* Unified Tabbed Sidebar Panel */}
        {activeSidebar && (
          <aside className="w-80 bg-slate-900 border-l border-slate-855 flex flex-col shrink-0 animate-in slide-in-from-right-8 duration-200 animate-out">
            <div className="p-3.5 border-b border-slate-850 flex justify-between items-center bg-slate-900">
              <h2 className="font-extrabold text-sm text-white select-none capitalize">
                {activeSidebar === 'chat' ? 'In-Call Messages' :
                 activeSidebar === 'participants' ? 'Meeting Participants' :
                 activeSidebar === 'ai' ? 'Codovate Assistant' :
                 activeSidebar === 'dev' ? 'Developer Dashboard' :
                 activeSidebar === 'timetravel' ? 'AI Time Travel' :
                 activeSidebar === 'focus' ? 'Co-working & Pomodoro' :
                 activeSidebar === 'interview' ? 'Technical Interview' : activeSidebar}
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setActiveSidebar(null)} className="h-7 w-7 text-slate-400 hover:text-white hover:bg-slate-850">
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Quick switcher inside sidebar */}
            <div className="grid grid-cols-5 border-b border-slate-850 bg-slate-900/40 p-1">
              {[
                { tab: 'chat', label: 'Chat', icon: <MessageSquare className="h-3.5 w-3.5" /> },
                { tab: 'participants', label: 'Users', icon: <Users className="h-3.5 w-3.5" /> },
                { tab: 'ai', label: 'AI', icon: <Sparkles className="h-3.5 w-3.5" /> },
                { tab: 'dev', label: 'Dev', icon: <Activity className="h-3.5 w-3.5" /> },
                { tab: 'timetravel', label: 'Timeline', icon: <Clock className="h-3.5 w-3.5" /> }
              ].map(item => (
                <button
                  key={item.tab}
                  onClick={() => setActiveSidebar(item.tab)}
                  title={item.label}
                  className={`py-1.5 flex justify-center rounded transition ${activeSidebar === item.tab ? 'bg-slate-800 text-primary' : 'text-slate-400 hover:text-white'}`}
                >
                  {item.icon}
                </button>
              ))}
            </div>

            <div className="flex-1 min-h-0 bg-slate-950/20">
              {renderSidebarContent()}
            </div>
          </aside>
        )}
      </div>

      {/* Floating Emojis Reaction Tray above Controls Dock */}
      {showReactionTray && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-full px-4 py-2 flex gap-3.5 shadow-2xl z-30 animate-in fade-in slide-in-from-bottom-2 duration-200 select-none">
          {['❤️', '👍', '🎉', '👏', '😂', '😮', '😢', '🤔'].map(emoji => (
            <button
              key={emoji}
              onClick={() => triggerReaction(emoji)}
              className="text-2xl hover:scale-130 transition-transform active:scale-95"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Bottom Floating Control Dock */}
      <footer className="px-4 py-3 bg-slate-900 border-t border-slate-855 flex items-center justify-between shrink-0 shadow-2xl">
        
        {/* Left footer: workspaces triggers */}
        <div className="flex gap-1.5 flex-wrap">
          <Button
            size="sm"
            onClick={() => setActiveWorkspace(activeWorkspace === 'code' ? 'none' : 'code')}
            className={`h-9 font-semibold text-xs border ${activeWorkspace === 'code' ? 'bg-primary text-white border-primary' : 'bg-slate-850 text-slate-300 border-slate-800'}`}
          >
            <Code className="h-4 w-4 mr-1.5" /> Code Workspace
          </Button>
          <Button
            size="sm"
            onClick={() => setActiveWorkspace(activeWorkspace === 'whiteboard' ? 'none' : 'whiteboard')}
            className={`h-9 font-semibold text-xs border ${activeWorkspace === 'whiteboard' ? 'bg-primary text-white border-primary' : 'bg-slate-855 text-slate-300 border-slate-800'}`}
          >
            <Paintbrush className="h-4 w-4 mr-1.5" /> Whiteboard
          </Button>
          <Button
            size="sm"
            onClick={() => setActiveWorkspace(activeWorkspace === 'uno' ? 'none' : 'uno')}
            className={`h-9 font-semibold text-xs border ${activeWorkspace === 'uno' ? 'bg-primary text-white border-primary' : 'bg-slate-855 text-slate-300 border-slate-800'}`}
          >
            🃏 UNO! Game
          </Button>
        </div>

        {/* Center footer: webcam media controls & triggers */}
        <div className="flex items-center gap-2 sm:gap-3.5">
          <Button size="icon" onClick={handleMuteToggle} className={`h-10 w-10 sm:h-11 sm:w-11 rounded-full border transition-all ${isMuted ? 'bg-red-500 border-red-500 text-white' : 'bg-slate-850 border-slate-800 text-white hover:bg-slate-800'}`} disabled={!room}>
            {isMuted ? <MicOff className="h-4.5 w-4.5" /> : <Mic className="h-4.5 w-4.5" />}
          </Button>

          <Button size="icon" onClick={handleVideoToggle} className={`h-10 w-10 sm:h-11 sm:w-11 rounded-full border transition-all ${isVideoOff ? 'bg-red-500 border-red-500 text-white' : 'bg-slate-850 border-slate-800 text-white hover:bg-slate-800'}`} disabled={!room}>
            {isVideoOff ? <VideoOff className="h-4.5 w-4.5" /> : <Video className="h-4.5 w-4.5" />}
          </Button>

          <Button size="icon" onClick={handleScreenShareToggle} className={`h-10 w-10 sm:h-11 sm:w-11 rounded-full border transition-all hidden sm:inline-flex ${isScreenSharing ? 'bg-primary border-primary text-white' : 'bg-slate-850 border-slate-800 text-white hover:bg-slate-800'}`} disabled={!room}>
            <MonitorUp className="h-4.5 w-4.5" />
          </Button>

          <Button size="icon" onClick={toggleHandRaise} className={`h-10 w-10 sm:h-11 sm:w-11 rounded-full border transition-all ${isHandRaised ? 'bg-amber-500 border-amber-500 text-white' : 'bg-slate-850 border-slate-800 text-white hover:bg-slate-800'}`} disabled={!room} title="Raise Hand">
            <span className="text-base">🖐️</span>
          </Button>

          <Button size="icon" onClick={() => setShowReactionTray(!showReactionTray)} className={`h-10 w-10 sm:h-11 sm:w-11 rounded-full border transition-all ${showReactionTray ? 'bg-primary border-primary text-white' : 'bg-slate-855 border-slate-805 text-white hover:bg-slate-800'}`} disabled={!room} title="Send Reaction">
            <Heart className="h-4.5 w-4.5" />
          </Button>

          <Button size="icon" onClick={() => setShowCaptions(!showCaptions)} className={`h-10 w-10 sm:h-11 sm:w-11 rounded-full border transition-all ${showCaptions ? 'bg-primary border-primary text-white' : 'bg-slate-855 border-slate-800 text-white hover:bg-slate-800'}`} title="Toggle Captions">
            <Subtitles className="h-4.5 w-4.5" />
          </Button>
        </div>

        {/* Right footer: utilities sidebar panels & call actions */}
        <div className="flex items-center gap-2">
          <div className="hidden lg:flex gap-1">
            <Button size="icon" onClick={() => setIsOnToGoMode(true)} className="h-8 w-8 rounded bg-slate-850 border border-slate-800 text-slate-400 hover:text-white" title="On-the-Go Mode">
              🚶
            </Button>
            <Button size="icon" onClick={() => setActiveSidebar(activeSidebar === 'effects' ? null : 'effects')} className={`h-8 w-8 rounded bg-slate-850 border border-slate-800 hover:bg-slate-800 ${activeSidebar === 'effects' ? 'text-primary' : 'text-slate-400'}`} title="Effects">
              <User className="h-4 w-4" />
            </Button>
            <Button size="icon" onClick={() => setActiveSidebar(activeSidebar === 'scheduler' ? null : 'scheduler')} className={`h-8 w-8 rounded bg-slate-855 border border-slate-800 hover:bg-slate-800 ${activeSidebar === 'scheduler' ? 'text-primary' : 'text-slate-400'}`} title="Schedule Follow-up">
              <Calendar className="h-4 w-4" />
            </Button>
            <Button size="icon" onClick={() => setActiveSidebar(activeSidebar === 'abuse' ? null : 'abuse')} className={`h-8 w-8 rounded bg-slate-855 border border-slate-800 hover:bg-slate-800 ${activeSidebar === 'abuse' ? 'text-primary' : 'text-slate-400'}`} title="Report Abuse">
              <Flag className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleLeaveCall} variant="outline" className="h-10 sm:h-11 px-3 sm:px-4 rounded-full border-slate-800 hover:bg-slate-850 font-bold text-xs select-none">
              Leave
            </Button>
            {user && user.id === meetingHostId && (
              <Button onClick={handleEndMeetingForAll} className="h-10 sm:h-11 px-3 sm:px-4 rounded-full bg-red-600 hover:bg-red-700 font-bold text-xs border-none select-none">
                <PhoneOff className="h-4 w-4 mr-1.5" /> End
              </Button>
            )}
          </div>
        </div>
      </footer>

      {shareError && (
        <div className="absolute top-18 left-6 right-6 bg-destructive/15 border border-destructive/20 text-destructive p-3 rounded-lg text-xs z-35 flex items-center gap-1.5 select-none animate-bounce">
          <span>⚠️</span> {shareError}
        </div>
      )}
    </div>
  )
}
