'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/useAuth'
import { meetingService } from '@/services/meeting'
import {
  LogOut, Plus, Video, Copy, Check, ArrowRight, Clock, Calendar,
  LayoutDashboard, Users, X, Globe, Tag, AlignLeft, Paperclip, Mail, Sparkles,
  ShieldCheck, KeyRound, Lock, AlertTriangle
} from 'lucide-react'
import { useEffect, useState } from 'react'
import Link from 'next/link'

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
}

interface MeetingRecord {
  id: string
  meeting_code: string
  created_at: string
  room_name?: string
  scheduled_at?: string
  duration?: number
}

export default function DashboardPage() {
  const { user, token, loadProfile, logout } = useAuth()
  const [recentMeetings, setRecentMeetings] = useState<MeetingRecord[]>([])
  const [createdCode, setCreatedCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [roomName, setRoomName] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)

  // Advanced Calendar Scheduler Modal states
  const [showCalendarModal, setShowCalendarModal] = useState(false)
  const [calTitle, setCalTitle] = useState('')
  const [calDate, setCalDate] = useState('')
  const [calTz, setCalTz] = useState('GMT-5 (EST)')
  const [calColor, setCalColor] = useState('blue')
  const [calDesc, setCalDesc] = useState('')
  const [calGuests, setCalGuests] = useState('')
  const [calAttachment, setCalAttachment] = useState('')

  // Floating AI Assistant states
  const [showFloatingAi, setShowFloatingAi] = useState(false)
  const [floatingAiInput, setFloatingAiInput] = useState('')
  const [floatingAiMessages, setFloatingAiMessages] = useState<{ sender: 'user' | 'ai'; text: string }[]>([
    { sender: 'ai', text: "Hey! I'm your Codovate AI Copilot. Ask me anything about engineering, system design, or meeting setups!" }
  ])
  const [floatingAiLoading, setFloatingAiLoading] = useState(false)

  // Two-Factor Authentication & Audit Logging states
  const [securityLogs, setSecurityLogs] = useState<any[]>([])
  const [mfaEnabled, setMfaEnabled] = useState(false)
  const [mfaSecret, setMfaSecret] = useState<string | null>(null)
  const [mfaQr, setMfaQr] = useState<string | null>(null)
  const [mfaSetupCode, setMfaSetupCode] = useState('')
  const [showMfaSetup, setShowMfaSetup] = useState(false)
  const [passwordResetStatus, setPasswordResetStatus] = useState<string | null>(null)

  const handleFloatingAiSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!floatingAiInput.trim() || floatingAiLoading) return
    const userText = floatingAiInput.trim()
    setFloatingAiMessages(prev => [...prev, { sender: 'user', text: userText }])
    setFloatingAiInput('')
    setFloatingAiLoading(true)

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userText, chatHistory: [] })
      })
      if (response.ok) {
        const data = await response.json()
        setFloatingAiMessages(prev => [...prev, { sender: 'ai', text: data.text }])
      } else {
        throw new Error()
      }
    } catch (err) {
      setFloatingAiMessages(prev => [...prev, { sender: 'ai', text: "❌ Connection error. Please verify your API keys in `.env.local`." }])
    } finally {
      setFloatingAiLoading(false)
    }
  }

  const fetchSecurityData = async () => {
    try {
      const activeToken = localStorage.getItem('token')
      if (!activeToken) return

      // Fetch profile details including mfa_enabled and role
      const profRes = await fetch('/api/profile', {
        headers: { 'Authorization': `Bearer ${activeToken}` }
      })
      if (profRes.ok) {
        const prof = await profRes.json()
        setMfaEnabled(prof.mfa_enabled || false)
        useAuth.setState({ user: prof })
      }

      // Fetch security audit logs
      const logsRes = await fetch('/api/security-logs', {
        headers: { 'Authorization': `Bearer ${activeToken}` }
      })
      if (logsRes.ok) {
        const logs = await logsRes.json()
        setSecurityLogs(logs)
      }
    } catch (e) {
      console.error('Failed to load security configurations:', e)
    }
  }

  const handleToggleMfa = async () => {
    const activeToken = localStorage.getItem('token')
    if (!activeToken) return

    if (mfaEnabled) {
      try {
        const res = await fetch('/api/mfa-setup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${activeToken}`
          },
          body: JSON.stringify({ action: 'disable' })
        })
        if (res.ok) {
          setMfaEnabled(false)
          setMfaSecret(null)
          alert('Two-Factor Authentication has been disabled.')
          await fetchSecurityData()
        }
      } catch (e) {
        alert('Failed to disable MFA')
      }
    } else {
      try {
        const res = await fetch('/api/mfa-setup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${activeToken}`
          },
          body: JSON.stringify({ action: 'generate' })
        })
        if (res.ok) {
          const data = await res.json()
          setMfaSecret(data.secret)
          setMfaQr(data.qrcode)
          setShowMfaSetup(true)
        }
      } catch (e) {
        alert('Failed to generate MFA secret')
      }
    }
  }

  const handleConfirmMfa = async (e: React.FormEvent) => {
    e.preventDefault()
    const activeToken = localStorage.getItem('token')
    if (!activeToken || !mfaSetupCode.trim()) return

    try {
      const res = await fetch('/api/mfa-setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`
        },
        body: JSON.stringify({ action: 'confirm', code: mfaSetupCode })
      })
      const data = await res.json()
      if (res.ok) {
        setMfaEnabled(true)
        setShowMfaSetup(false)
        setMfaSecret(null)
        setMfaSetupCode('')
        alert('Two-Factor Authentication successfully enabled!')
        await fetchSecurityData()
      } else {
        alert(data.error || 'Failed to confirm Two-Factor setup')
      }
    } catch (e) {
      alert('Network error confirming Two-Factor setup')
    }
  }

  const handleRequestPasswordReset = async () => {
    if (!user || !user.email) return
    setPasswordResetStatus('Generating reset link...')
    try {
      const res = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email })
      })
      if (res.ok) {
        setPasswordResetStatus('🔑 Success! A simulated reset link has been printed in your server logs console output.')
      } else {
        setPasswordResetStatus('❌ Failed to request password reset.')
      }
    } catch (e) {
      setPasswordResetStatus('❌ Connection error requesting reset link.')
    }
  }

  useEffect(() => {
    if (!token) { window.location.href = '/login'; return }
    const init = async () => {
      await loadProfile()
      try {
        const meetings = await meetingService.getRecentMeetings()
        setRecentMeetings(meetings)
      } catch (err) { console.error(err) }
      await fetchSecurityData()
    }
    init()
  }, [token])

  const handleCreateMeeting = async () => {
    setIsCreating(true)
    try {
      const data = await meetingService.createMeeting({ roomName, scheduledAt })
      setCreatedCode(data.meetingId)
      const meetings = await meetingService.getRecentMeetings()
      setRecentMeetings(meetings)
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create meeting.')
    } finally { setIsCreating(false) }
  }

  const handleCreateCalendarMeeting = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!calTitle.trim() || !calDate) return
    setIsCreating(true)

    // Serialize calendar options into roomName as a JSON string to avoid DB schema alterations
    const serializedRoomName = JSON.stringify({
      name: calTitle.trim(),
      color: calColor,
      desc: calDesc.trim(),
      tz: calTz,
      guests: calGuests.trim(),
      attachment: calAttachment
    })

    try {
      const data = await meetingService.createMeeting({ roomName: serializedRoomName, scheduledAt: calDate })
      setCreatedCode(data.meetingId)
      
      // Reset forms and close modal
      setCalTitle(''); setCalDate(''); setCalDesc(''); setCalGuests(''); setCalAttachment('')
      setShowCalendarModal(false)

      const meetings = await meetingService.getRecentMeetings()
      setRecentMeetings(meetings)
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to schedule calendar event.')
    } finally { setIsCreating(false) }
  }

  const handleCopyLink = () => {
    if (!createdCode) return
    navigator.clipboard.writeText(`${window.location.origin}/room/${createdCode}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleJoinMeeting = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!joinCode.trim()) return
    setIsJoining(true); setJoinError(null)
    try {
      const cleanCode = joinCode.trim().toUpperCase()
      await meetingService.validateMeeting(cleanCode)
      window.location.href = `/room/${cleanCode}`
    } catch (err: any) {
      setJoinError(err.response?.data?.error || 'Invalid meeting code')
      setIsJoining(false)
    }
  }

  // Parse rich serialized calendar data
  const parseMeetingName = (nameField?: string) => {
    if (!nameField) return { name: 'Untitled Meeting', color: 'blue', desc: '', tz: '', guests: '', attachment: '' }
    if (nameField.startsWith('{')) {
      try {
        const parsed = JSON.parse(nameField)
        return {
          name: parsed.name || 'Untitled Meeting',
          color: parsed.color || 'blue',
          desc: parsed.desc || '',
          tz: parsed.tz || '',
          guests: parsed.guests || '',
          attachment: parsed.attachment || ''
        }
      } catch (e) {}
    }
    return { name: nameField, color: 'blue', desc: '', tz: '', guests: '', attachment: '' }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-3 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground text-sm font-medium">Loading your workspace...</p>
        </div>
      </div>
    )
  }

  const colorDotClasses: Record<string, string> = {
    red: 'bg-red-500',
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    indigo: 'bg-indigo-500'
  }

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      
      {/* ── HEADER ── */}
      <header className="bg-primary px-6 flex items-center justify-between z-50 h-16 shadow-lg shadow-primary/25" style={{ borderBottom: '2px solid rgba(147,210,255,0.55)' }}>
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-full bg-white/20 border border-white/30 flex items-center justify-center">
            <Video className="h-4 w-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-extrabold text-lg tracking-tight text-white select-none">Codovate-Meet</span>
        </Link>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col items-end select-none">
            <p className="text-sm font-bold text-white leading-tight">{user.name}</p>
            <p className="text-[10px] text-blue-200/70">{user.email}</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-white font-bold text-sm select-none">
            {user.name?.[0]?.toUpperCase()}
          </div>
          <Button variant="outline" size="sm" onClick={logout}
            className="border-white/30 text-white bg-white/10 hover:bg-white/20 hover:border-white/50 font-semibold h-9 rounded-xl">
            <LogOut className="h-4 w-4 mr-1.5" /> Logout
          </Button>
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10 space-y-10">

        {/* Welcome banner */}
        <motion.div {...fadeInUp} className="relative overflow-hidden hero-gradient rounded-2xl p-8 shadow-lg">
          <div className="orb w-64 h-64 bg-blue-300/20 top-[-40px] right-0" />
          <div className="relative z-10 select-none">
            <p className="text-blue-200 text-sm font-semibold mb-1">👋 Welcome back</p>
            <h1 className="text-3xl font-black text-white mb-2">{user.name}</h1>
            <p className="text-blue-100/80 text-sm">Create meetings or schedule calendar sessions in your developer workspace.</p>
          </div>
        </motion.div>

        {/* Action Cards */}
        <div className="grid md:grid-cols-2 gap-6">

          {/* Create / Schedule Meeting Card */}
          <motion.div {...fadeInUp} className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-primary/5 to-blue-50 border-b border-border px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center shadow-sm shadow-primary/30">
                  <Video className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-foreground text-base">New Meeting</h2>
                  <p className="text-xs text-muted-foreground">Generate a shareable meeting link</p>
                </div>
              </div>
              <Button
                onClick={() => setShowCalendarModal(true)}
                variant="outline"
                className="h-8 text-xs font-bold border-primary text-primary hover:bg-primary/5 rounded-lg"
              >
                📅 Schedule Calendar Event
              </Button>
            </div>

            <div className="p-6 space-y-4">
              {createdCode ? (
                <div className="space-y-4">
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-center select-none">
                    <p className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wider">Your meeting link</p>
                    <p className="font-mono text-sm font-bold text-primary truncate select-all">
                      {typeof window !== 'undefined' ? `${window.location.origin}/room/${createdCode}` : createdCode}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={handleCopyLink} className="flex-1 rounded-xl font-semibold border-border">
                      {copied ? <><Check className="h-4 w-4 mr-2 text-green-500" /> Copied!</> : <><Copy className="h-4 w-4 mr-2" /> Copy Link</>}
                    </Button>
                    <Button className="flex-1 btn-glow text-white font-bold rounded-xl"
                      onClick={() => window.location.href = `/room/${createdCode}`}>
                      Start Call <ArrowRight className="h-4 w-4 ml-1.5" />
                    </Button>
                  </div>
                  <button className="w-full text-xs text-muted-foreground hover:text-primary transition-colors text-center font-medium"
                    onClick={() => { setCreatedCode(null); setRoomName(''); setScheduledAt('') }}>
                    + Create another meeting
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <LayoutDashboard className="h-3.5 w-3.5 text-primary" /> Meeting Name
                    </label>
                    <Input placeholder="e.g. Sprint Sync, Daily Standup"
                      value={roomName} onChange={(e) => setRoomName(e.target.value)}
                      className="bg-background border-border rounded-xl h-11" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-primary" /> Schedule <span className="text-muted-foreground font-normal text-xs">(optional)</span>
                    </label>
                    <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)}
                      className="bg-background border-border rounded-xl h-11" />
                  </div>
                  <Button className="w-full btn-glow text-white font-bold rounded-xl h-12"
                    onClick={handleCreateMeeting} disabled={isCreating}>
                    <Plus className="h-4 w-4 mr-2" />
                    {isCreating ? 'Creating...' : 'Create Instant Meeting'}
                  </Button>
                </div>
              )}
            </div>
          </motion.div>

          {/* Join Meeting Card */}
          <motion.div {...fadeInUp} className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-border px-6 py-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-sm shadow-indigo-500/30">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-foreground text-base">Join Meeting</h2>
                <p className="text-xs text-muted-foreground">Enter a meeting code to join</p>
              </div>
            </div>

            <div className="p-6">
              <form onSubmit={handleJoinMeeting} className="space-y-4">
                {joinError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl font-medium">
                    ⚠ {joinError}
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-foreground">Meeting Code</label>
                  <Input placeholder="CDV-XXXX-XXXX"
                    className="bg-background border-border rounded-xl h-12 uppercase font-mono tracking-widest text-center text-lg font-bold"
                    value={joinCode} onChange={(e) => setJoinCode(e.target.value)} required />
                  <p className="text-xs text-muted-foreground text-center select-none">Paste the meeting code shared with you</p>
                </div>
                <Button type="submit"
                  className="w-full h-12 rounded-xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 hover:opacity-90 text-white shadow-md shadow-indigo-500/20 border-none cursor-pointer"
                  disabled={isJoining}>
                  {isJoining ? 'Joining...' : <><ArrowRight className="h-4 w-4 mr-2" />Join Meeting</>}
                </Button>
              </form>
            </div>
          </motion.div>
        </div>

        {/* Meeting History Section */}
        <motion.section {...fadeInUp} className="space-y-4">
          <div className="flex items-center gap-3 select-none">
            <Clock className="h-4 w-4 text-primary" />
            <h2 className="font-black text-foreground uppercase tracking-widest text-xs">Upcoming & Recent Meetings</h2>
          </div>

          <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm">
            {recentMeetings.length === 0 ? (
              <div className="py-16 text-center flex flex-col items-center gap-4 select-none">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Video className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-foreground mb-1">No scheduled sessions</p>
                  <p className="text-sm text-muted-foreground">Schedule a calendar event or create instant meetings above.</p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-secondary/40 border-b border-border select-none">
                    <tr>
                      <th className="text-left px-6 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">Event</th>
                      <th className="text-left px-6 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">Code</th>
                      <th className="text-left px-6 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">Date & Time</th>
                      <th className="text-left px-6 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">Timezone / Guests</th>
                      <th className="text-right px-6 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recentMeetings.map((m) => {
                      const calData = parseMeetingName(m.room_name)
                      
                      return (
                        <tr key={m.id} className="hover:bg-secondary/10 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2.5">
                              <span className={`w-3 h-3 rounded-full shrink-0 ${colorDotClasses[calData.color] || 'bg-blue-500'}`} title={`Color category: ${calData.color}`} />
                              <div>
                                <p className="font-semibold text-foreground text-sm leading-none">{calData.name}</p>
                                {calData.desc && <p className="text-[10px] text-slate-400 mt-1 truncate max-w-44">{calData.desc}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-mono text-xs font-bold bg-primary/10 text-primary px-2.5 py-1 rounded-lg border border-primary/20 select-all">
                              {m.meeting_code}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-muted-foreground text-sm">
                            {new Date(m.scheduled_at || m.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                          </td>
                          <td className="px-6 py-4 text-xs text-muted-foreground">
                            {calData.tz && <p className="font-semibold text-slate-500">{calData.tz}</p>}
                            {calData.guests && <p className="text-[10px] truncate max-w-44 text-slate-400">{calData.guests}</p>}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Button size="sm" onClick={() => window.location.href = `/room/${m.meeting_code}`}
                              className="bg-primary/10 text-primary hover:bg-primary hover:text-white border-0 font-semibold rounded-lg transition-all h-8">
                              Join →
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </motion.section>

        {/* ── SECURITY SETTINGS & AUDIT LOGS SECTION ── */}
        <motion.section {...fadeInUp} className="grid md:grid-cols-2 gap-6 pt-4">
          {/* Security controls */}
          <div className="bg-white border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-6">
            <div>
              <div className="flex items-center gap-3 border-b border-border pb-4 mb-4 select-none">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm leading-none">Security Center</h3>
                  <p className="text-[10px] text-muted-foreground mt-1">Configure MFA, resets, and RBAC authorization</p>
                </div>
              </div>

              <div className="space-y-4 text-sm">
                {/* Email Verification status */}
                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    <div>
                      <p className="font-bold text-slate-700 text-xs leading-none">Account Status</p>
                      <p className="text-[10px] text-slate-400 mt-1">Verification and validation</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    ✓ Verified Email
                  </span>
                </div>

                {/* Two Factor setup */}
                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-indigo-500" />
                    <div>
                      <p className="font-bold text-slate-700 text-xs leading-none">Two-Factor Auth (2FA)</p>
                      <p className="text-[10px] text-slate-400 mt-1">Protect with authenticator codes</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleToggleMfa}
                    className={`h-8 text-xs font-bold px-3 rounded-lg border-none ${mfaEnabled ? 'bg-red-650 hover:bg-red-750 text-white' : 'bg-primary hover:opacity-90 text-white'}`}
                  >
                    {mfaEnabled ? 'Disable 2FA' : 'Enable 2FA'}
                  </Button>
                </div>

                {/* 2FA confirmation input popover */}
                {showMfaSetup && mfaSecret && (
                  <form onSubmit={handleConfirmMfa} className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-white space-y-3 animate-in slide-in-from-top-2">
                    <p className="text-xs font-bold text-slate-300">Set Up Two-Factor Authentication</p>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      Scan QR code or use manual key: <strong className="text-indigo-400 font-mono select-all bg-slate-950 px-2 py-0.5 rounded border border-slate-800">{mfaSecret}</strong>
                    </p>
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Enter 6-digit confirmation code (e.g. 123456)"
                        value={mfaSetupCode}
                        onChange={(e) => setMfaSetupCode(e.target.value)}
                        className="h-8 bg-slate-850 text-xs text-white border-slate-700"
                        required
                      />
                      <Button type="submit" size="sm" className="h-8 text-xs font-bold px-3 bg-primary border-none">Confirm</Button>
                    </div>
                    <button type="button" onClick={() => setShowMfaSetup(false)} className="text-[10px] text-slate-400 hover:text-white underline bg-transparent border-none">Cancel</button>
                  </form>
                )}

                {/* RBAC details */}
                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl select-none">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-500" />
                    <div>
                      <p className="font-bold text-slate-700 text-xs leading-none">Security Role (RBAC)</p>
                      <p className="text-[10px] text-slate-400 mt-1">Access control groups</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-extrabold bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-200 uppercase">
                    👥 {user.role || 'user'}
                  </span>
                </div>
              </div>
            </div>

            {/* Reset password */}
            <div className="border-t border-border pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRequestPasswordReset}
                className="w-full text-xs font-bold border-border h-10 rounded-xl"
              >
                🔒 Request Password Reset Link
              </Button>
              {passwordResetStatus && (
                <p className="text-[10px] font-semibold mt-2 text-center text-slate-500 leading-tight">
                  {passwordResetStatus}
                </p>
              )}
            </div>
          </div>

          {/* Security Audit Timeline */}
          <div className="bg-white border border-border rounded-2xl p-6 shadow-sm flex flex-col h-[380px]">
            <div className="flex items-center justify-between border-b border-border pb-4 mb-4 select-none">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm leading-none">Audit Trail Log</h3>
                  <p className="text-[10px] text-muted-foreground mt-1">Real-time record of authentication events</p>
                </div>
              </div>
              <button onClick={fetchSecurityData} className="text-slate-400 hover:text-slate-600 transition bg-transparent border-none outline-none" title="Refresh audit log">
                <Clock className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-1 select-text">
              {securityLogs.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground italic select-none">
                  No security audits logged.
                </div>
              ) : (
                securityLogs.map((log, index) => (
                  <div key={index} className="flex gap-3 text-xs leading-relaxed items-start border-b border-slate-50 pb-2.5">
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                      log.event_type.includes('SUCCESS') || log.event_type.includes('ENABLED') ? 'bg-emerald-500' :
                      log.event_type.includes('FAIL') || log.event_type.includes('LOCKED') ? 'bg-red-500' : 'bg-indigo-500'
                    }`} />
                    <div className="flex-1">
                      <p className="font-bold text-slate-700 text-xs leading-tight flex items-center gap-1.5 justify-between">
                        <span>{log.event_type}</span>
                        <span className="text-[9px] font-normal text-muted-foreground">IP: {log.ip_address}</span>
                      </p>
                      <p className="text-slate-500 text-[10px] mt-0.5 leading-tight">{log.details}</p>
                      <span className="text-[8px] text-muted-foreground select-none block mt-1">
                        {new Date(log.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </motion.section>
      </main>

      {/* ── ADVANCED CALENDAR SCHEDULER MODAL ── */}
      {showCalendarModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-border"
          >
            {/* Modal header */}
            <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center text-white">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <h3 className="font-extrabold text-base">Schedule Event (Google Calendar)</h3>
              </div>
              <button onClick={() => setShowCalendarModal(false)} className="text-slate-400 hover:text-white transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal form */}
            <form onSubmit={handleCreateCalendarMeeting} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5"><LayoutDashboard className="h-3.5 w-3.5 text-primary" /> Event Title</label>
                <Input placeholder="Tech Architecture Review, Sprint Kickoff..." value={calTitle} onChange={(e) => setCalTitle(e.target.value)} required className="h-10 border-border" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-primary" /> Start Date & Time</label>
                  <Input type="datetime-local" value={calDate} onChange={(e) => setCalDate(e.target.value)} required className="h-10 border-border" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5"><Globe className="h-3.5 w-3.5 text-primary" /> Time Zone</label>
                  <select value={calTz} onChange={(e) => setCalTz(e.target.value)} className="w-full h-10 bg-background border border-border rounded-xl px-3 text-sm text-foreground outline-none focus:border-primary">
                    <option>GMT-5 (EST)</option>
                    <option>GMT-8 (PST)</option>
                    <option>GMT+0 (UTC)</option>
                    <option>GMT+1 (BST)</option>
                    <option>GMT+5:30 (IST)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5"><Tag className="h-3.5 w-3.5 text-primary" /> Event Color</label>
                  <select value={calColor} onChange={(e) => setCalColor(e.target.value)} className="w-full h-10 bg-background border border-border rounded-xl px-3 text-sm text-foreground outline-none focus:border-primary">
                    <option value="blue">🔵 Royal Blue</option>
                    <option value="red">🔴 Coral Red</option>
                    <option value="green">🟢 Mint Green</option>
                    <option value="yellow">🟡 Amber Yellow</option>
                    <option value="indigo">🟣 Deep Indigo</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5"><Paperclip className="h-3.5 w-3.5 text-primary" /> Attachments</label>
                  <select value={calAttachment} onChange={(e) => setCalAttachment(e.target.value)} className="w-full h-10 bg-background border border-border rounded-xl px-3 text-sm text-foreground outline-none focus:border-primary">
                    <option value="">No files selected</option>
                    <option value="architecture_doc.pdf">📁 architecture_doc.pdf</option>
                    <option value="product_roadmap.xlsx">📁 product_roadmap.xlsx</option>
                    <option value="sprint_board.json">📁 sprint_board.json</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-primary" /> Invite Guests (Emails)</label>
                <Input placeholder="developer@company.com, designer@company.com" value={calGuests} onChange={(e) => setCalGuests(e.target.value)} className="h-10 border-border" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5"><AlignLeft className="h-3.5 w-3.5 text-primary" /> Event Description</label>
                <textarea value={calDesc} onChange={(e) => setCalDesc(e.target.value)} className="w-full p-3 bg-background border border-border rounded-xl text-sm text-foreground h-20 outline-none focus:border-primary" placeholder="Define deliverables, agendas, and goals..." />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowCalendarModal(false)} className="flex-1 h-11 rounded-xl font-bold border-border">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 btn-glow text-white font-bold h-11 rounded-xl border-none">
                  {isCreating ? 'Saving...' : 'Save & Schedule'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ── FLOATING AI ASSISTANT CHAT ── */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 font-sans select-none">
        {showFloatingAi && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-96 text-white"
          >
            {/* Header */}
            <div className="bg-slate-955 p-4 border-b border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
                <h4 className="font-extrabold text-sm text-white flex items-center gap-1"><Sparkles className="h-4 w-4 text-primary" /> AI Assistant</h4>
              </div>
              <button type="button" onClick={() => setShowFloatingAi(false)} className="text-slate-400 hover:text-white transition">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Message Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 select-text custom-scrollbar">
              {floatingAiMessages.map((msg, i) => (
                <div key={i} className={`p-2.5 rounded-xl text-xs leading-relaxed max-w-[85%] ${msg.sender === 'user' ? 'bg-primary text-white ml-auto' : 'bg-slate-800 text-slate-200 mr-auto'}`}>
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>
              ))}
              {floatingAiLoading && (
                <div className="text-[10px] text-slate-400 italic animate-pulse">Thinking...</div>
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleFloatingAiSend} className="p-3 bg-slate-955 border-t border-slate-800 flex gap-2">
              <Input
                placeholder="Ask AI anything..."
                value={floatingAiInput}
                onChange={(e) => setFloatingAiInput(e.target.value)}
                className="h-8 bg-slate-900 border-slate-800 text-xs text-white"
              />
              <Button type="submit" disabled={!floatingAiInput.trim()} className="h-8 text-xs font-bold px-3">
                Send
              </Button>
            </form>
          </motion.div>
        )}

        <button
          onClick={() => setShowFloatingAi(!showFloatingAi)}
          className="w-14 h-14 bg-gradient-to-tr from-primary to-blue-600 rounded-full flex items-center justify-center shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-transform"
          title="Ask Codovate AI Anything"
        >
          <Sparkles className="h-6 w-6 text-white animate-pulse" />
        </button>
      </div>
    </div>
  )
}
